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
];

// Pages a signed-in person may open before confirming the two-step verification code.
const MFA_FREE = ["/entrar", "/auth", "/api", "/redefinir-senha", "/termos", "/privacidade", "/sobre"];

/**
 * CSP por requisição com nonce. Em produção, script-src usa 'nonce-...' + 'strict-dynamic'
 * (sem 'unsafe-inline'): o Next.js aplica o nonce automaticamente aos próprios scripts ao
 * ler o header content-security-policy da requisição, e o strict-dynamic permite os chunks
 * carregados por eles. Em desenvolvimento mantém unsafe-inline/eval para o HMR/overlay.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://lh3.googleusercontent.com",
    "media-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org${isDev ? " ws: http://localhost:*" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
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
  const csp = buildCsp(nonce, isDev);

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
