import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Full-size premium stickers. Only someone who owns the pack (or received the sticker in a chat,
// or is an admin) gets the file — the check is sticker_readable() in the database, never the client.
// Previews stay public in /stickers so the store can show a pack before it is bought.
export const dynamic = "force-dynamic";

const SAFE = /^[a-z0-9-]{1,32}\/[a-z0-9-]{1,48}\.(webp|png|gif)$/;
const ROOT = path.join(process.cwd(), "private-stickers");
const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", gif: "image/gif" };

export async function GET(_req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  const file = (params.path ?? []).join("/");
  if (!SAFE.test(file)) return new NextResponse(null, { status: 404 });

  const supabase = await createClient();
  // Exige usuário autenticado (defesa em profundidade; sticker_readable também checa no banco).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 403 });

  const { data: sticker } = await supabase.from("Sticker").select("id, storage").eq("file", file).maybeSingle();
  if (!sticker || (sticker.storage !== "app-premium" && sticker.storage !== "premium")) {
    return new NextResponse(null, { status: 404 });
  }
  const { data: allowed } = await supabase.rpc("sticker_readable", { p_sticker: sticker.id });
  if (!allowed) return new NextResponse(null, { status: 403 });

  if (sticker.storage === "premium") {
    // Bucket privado (upload de admin): link assinado de vida curta (2 min) — reduz reuso do link.
    const { data } = await supabase.storage.from("sticker-premium").createSignedUrl(file, 120);
    if (!data?.signedUrl) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=90" } });
  }

  try {
    const body = await readFile(path.join(ROOT, file));
    return new NextResponse(body, {
      headers: {
        "Content-Type": TYPES[file.split(".").pop() as string],
        "Cache-Control": "private, max-age=604800, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
