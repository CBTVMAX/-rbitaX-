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
      const { data: profile } = await supabase
        .from("Profile")
        .select("birthDate, gender")
        .eq("userId", data.user.id)
        .single();
      const { data: user } = await supabase
        .from("User")
        .select("termsAcceptedAt, privacyAcceptedAt")
        .eq("id", data.user.id)
        .single();

      const incomplete = !profile?.birthDate || !profile?.gender || !user?.termsAcceptedAt || !user?.privacyAcceptedAt;
      if (incomplete) {
        return NextResponse.redirect(`${origin}/completar-cadastro`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
