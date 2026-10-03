import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/feed",
  "/mensagens",
  "/musica",
  "/videos",
  "/perfil",
  "/configuracoes",
  "/notificacoes",
  "/amigos",
  "/diamantes",
  "/loja",
  "/admin",
  "/convite",
  // Tudo do Órbita X exige conta: nada de perfil, comunidade ou conteúdo para quem está de fora.
  "/explorar",
  "/comunidades",
  "/diag-avatar",
];

// Pages a signed-in person may open before confirming the two-step verification code.
const MFA_FREE = ["/entrar", "/auth", "/api", "/redefinir-senha", "/termos", "/privacidade", "/sobre", "/verificacao"];

// Áreas dinâmicas do app (renderizadas por requisição): aqui o Next injeta o nonce nos
// scripts, então usamos a CSP forte com nonce + strict-dynamic. É onde vive o conteúdo
// gerado por usuários (maior superfície de XSS). Páginas fora desta lista (login, cadastro,
// landing, termos… muitas são estáticas/pré-renderizadas, onde o nonce por requisição não
// entra no HTML) recebem uma CSP que funciona em página estática, sem quebrar os scripts.
const STRICT_APP_PREFIXES = [
  "/feed", "/mensagens", "/comunidades", "/perfil", "/configuracoes",
  "/notificacoes", "/amigos", "/diamantes", "/loja", "/admin",
  "/explorar", "/musica", "/videos", "/convite",
];

/**
 * CSP por requisição. Em produção, nas áreas dinâmicas do app, script-src usa
 * 'nonce-...' + 'strict-dynamic' (sem 'unsafe-inline'): o Next aplica o nonce aos próprios
 * scripts. Nas demais páginas (estáticas), usa 'self' 'unsafe-inline' — a única forma de os
 * scripts do Next rodarem em HTML pré-gerado. Em desenvolvimento mantém unsafe-eval p/ HMR.
 */
function buildCsp(nonce: string, isDev: boolean, strict: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : strict
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    // archive.org: capas e áudio do catálogo de música (Creative Commons / domínio público).
    "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://lh3.googleusercontent.com https://archive.org https://*.archive.org https://coverartarchive.org https://i.ytimg.com",
    "media-src 'self' data: blob: https://*.supabase.co https://archive.org https://*.archive.org",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org${isDev ? " ws: http://localhost:*" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    // Player oficial do YouTube (música completa, licenciada pelo próprio YouTube).
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function updateSession(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const strictCsp = STRICT_APP_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  const csp = buildCsp(nonce, isDev, strictCsp);

  // O Next lê o nonce do header content-security-policy da REQUISIÇÃO e o aplica aos seus scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set("content-security-policy", csp);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  // A login ended elsewhere ("sair de todos os aparelhos", revoked device, password reset):
  // the leftover cookies are cleared so this browser stops presenting a dead session.
  if (!user && userError && (userError.code === "session_not_found" || userError.code === "refresh_token_not_found" || userError.status === 403)) {
    await supabase.auth.signOut({ scope: "local" });
  }

  // user comes fresh from Supabase Auth, so a factor enabled on another device is already known here.
  if (user && user.factors?.some((f) => f.status === "verified") && !MFA_FREE.some((p) => path.startsWith(p))) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = "";
      url.searchParams.set("mfa", "1");
      url.searchParams.set("redirect", path);
      const redirectRes = NextResponse.redirect(url);
      redirectRes.headers.set("content-security-policy", csp);
      return redirectRes;
    }
  }

  // Código por e-mail/SMS (verificação em duas etapas sem app): a sessão só segue depois de confirmar.
  if (user && user.app_metadata?.two_factor && !MFA_FREE.some((p) => path.startsWith(p))) {
    const { data: gate, error: gateError } = await supabase.rpc("two_factor_gate", { p_device: request.cookies.get("ox_td")?.value ?? null });
    if (gateError || gate !== "ok") {
      const url = request.nextUrl.clone();
      url.pathname = "/verificacao";
      url.search = "";
      url.searchParams.set("redirect", path);
      const redirectRes = NextResponse.redirect(url);
      redirectRes.headers.set("content-security-policy", csp);
      return redirectRes;
    }
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirect", path);
    const redirectRes = NextResponse.redirect(url);
    redirectRes.headers.set("content-security-policy", csp);
    return redirectRes;
  }

  return response;
}
