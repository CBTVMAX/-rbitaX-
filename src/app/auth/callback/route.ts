import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
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
