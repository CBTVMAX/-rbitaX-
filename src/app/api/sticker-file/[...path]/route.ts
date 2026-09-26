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

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const file = (params.path ?? []).join("/");
  if (!SAFE.test(file)) return new NextResponse(null, { status: 404 });

  const supabase = createClient();
  const { data: sticker } = await supabase.from("Sticker").select("id, storage").eq("file", file).maybeSingle();
  if (!sticker || (sticker.storage !== "app-premium" && sticker.storage !== "premium")) {
    return new NextResponse(null, { status: 404 });
  }
  const { data: allowed } = await supabase.rpc("sticker_readable", { p_sticker: sticker.id });
  if (!allowed) return new NextResponse(null, { status: 403 });

  if (sticker.storage === "premium") {
    // Uploaded by an admin to the private bucket: short-lived signed link.
    const { data } = await supabase.storage.from("sticker-premium").createSignedUrl(file, 60 * 60);
    if (!data?.signedUrl) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=3000" } });
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
