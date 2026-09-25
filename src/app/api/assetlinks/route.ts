import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// /.well-known/assetlinks.json (rewritten here): proves to Android that the ÓrbitaX app
// (br.social.orbitax) belongs to orbitax.social.br, so it opens full screen.
// The certificate fingerprint is public and comes from the key kept in Supabase Vault.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data: sha256 } = await supabase.rpc("android_cert_fingerprint");

  const body = sha256
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "br.social.orbitax",
            sha256_cert_fingerprints: [sha256],
          },
        },
      ]
    : [];

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
