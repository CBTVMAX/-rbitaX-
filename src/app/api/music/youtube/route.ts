import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseYouTubeId } from "@/lib/music";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Confere um link do YouTube antes de virar música no Órbita X: o vídeo precisa existir e permitir
 * ser tocado fora do YouTube. Devolve título e canal (oEmbed oficial, sem chave de API).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: "not_authenticated" }, 401);

  const id = parseYouTubeId(req.nextUrl.searchParams.get("url") ?? "");
  if (!id) return json({ error: "invalid_link" }, 400);

  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
    { cache: "no-store", signal: AbortSignal.timeout(8000) }
  ).catch(() => null);
  if (!res) return json({ error: "unavailable" }, 502);
  if (res.status === 401 || res.status === 403) return json({ error: "embed_blocked" }, 422);
  if (!res.ok) return json({ error: "not_found" }, 404);
  const data = (await res.json().catch(() => null)) as { title?: string; author_name?: string } | null;
  if (!data?.title) return json({ error: "not_found" }, 404);

  return json({ id, title: data.title.slice(0, 200), channel: (data.author_name ?? "").slice(0, 120) });
}
