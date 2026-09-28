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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
      return NextResponse.redirect(url);
    }
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return response;
}
