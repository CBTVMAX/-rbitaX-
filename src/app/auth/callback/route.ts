import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safe-redirect";

/** Authentication methods recorded in the access token (a password-recovery link reports "recovery"). */
function tokenMethods(accessToken: string | undefined): string[] {
  try {
    const payload = JSON.parse(Buffer.from((accessToken ?? "").split(".")[1], "base64url").toString("utf8"));
    return Array.isArray(payload?.amr) ? payload.amr.map((a: { method?: string }) => a?.method ?? "") : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only paths on this site: "?next=//evil.com" or "?next=.evil.com" can no longer bounce people elsewhere.
  const next = safeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      // Link from "Esqueceu sua senha?": straight to choosing a new password.
      if (tokenMethods(data.session?.access_token).includes("recovery") || searchParams.get("type") === "recovery") {
        return NextResponse.redirect(`${origin}/redefinir-senha`);
      }

      // Accounts with two-step verification confirm the code before anything else.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel !== "aal2" && aal.nextLevel === "aal2") {
        return NextResponse.redirect(`${origin}/entrar?mfa=1&redirect=${encodeURIComponent(next)}`);
      }

      const { data: rows } = await supabase.rpc("my_account_details");
      const account = Array.isArray(rows) ? rows[0] : null;

      const incomplete =
        !account?.birthDate || !account?.gender || !account?.termsAcceptedAt || !account?.privacyAcceptedAt;
      if (incomplete) {
        return NextResponse.redirect(`${origin}/completar-cadastro`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
