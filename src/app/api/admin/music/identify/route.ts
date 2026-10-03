import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const UA = "OrbitaX/1.0 (https://orbitax.social.br)";

type MBRelease = {
  id: string;
  title: string;
  status?: string;
  date?: string;
  "release-group"?: { id: string; "primary-type"?: string; "secondary-types"?: string[] };
};
type MBRecording = {
  id: string;
  title: string;
  score?: number;
  length?: number;
  "first-release-date"?: string;
  "artist-credit"?: { name: string; joinphrase?: string }[];
  releases?: MBRelease[];
  tags?: { name: string; count: number }[];
};

const clean = (s: string) => s.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Painel → Músicas: reconhece álbum, ano e capa de uma faixa pelo MusicBrainz (base aberta de músicas),
 * a partir de artista e título. Prefere o álbum oficial original (não coletânea, não ao vivo).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) return json({ error: "forbidden" }, 403);

  const artist = clean(req.nextUrl.searchParams.get("artist") ?? "").slice(0, 120);
  const title = clean(req.nextUrl.searchParams.get("title") ?? "").slice(0, 160);
  if (!artist || !title) return json({ error: "missing" }, 400);

  const query = `recording:"${title}" AND artist:"${artist}"`;
  const res = await fetch(`https://musicbrainz.org/ws/2/recording/?fmt=json&limit=15&query=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!res) return json({ error: "unavailable" }, 502);
  if (res.status === 503) return json({ error: "busy" }, 503);
  const data = (await res.json().catch(() => null)) as { recordings?: MBRecording[] } | null;
  const recordings = (data?.recordings ?? []).filter((r) => (r.score ?? 0) >= 85 && norm(r.title) === norm(title));
  if (!recordings.length) return json({ found: false });

  // Melhor lançamento: álbum oficial, sem ser coletânea/ao vivo/trilha, o mais antigo.
  type Pick = { rec: MBRecording; rel: MBRelease; rank: number; date: string };
  const picks: Pick[] = [];
  for (const rec of recordings) {
    for (const rel of rec.releases ?? []) {
      const rg = rel["release-group"];
      const secondary = rg?.["secondary-types"] ?? [];
      const rank =
        (rel.status === "Official" ? 0 : 4) +
        (rg?.["primary-type"] === "Album" ? 0 : rg?.["primary-type"] === "Single" ? 2 : 3) +
        (secondary.length ? 5 : 0);
      picks.push({ rec, rel, rank, date: rel.date || "9999" });
    }
  }
  picks.sort((a, b) => a.rank - b.rank || a.date.localeCompare(b.date));
  const best = picks[0];
  const rec = best?.rec ?? recordings[0];
  const rel = best?.rel ?? null;
  const year = Number((rec["first-release-date"] || rel?.date || "").slice(0, 4)) || null;
  const credit = (rec["artist-credit"] ?? []).map((a) => a.name + (a.joinphrase ?? "")).join("").trim();

  // Capa oficial (Cover Art Archive), conferindo se existe.
  let coverUrl: string | null = null;
  const rgId = rel?.["release-group"]?.id;
  for (const url of [rgId && `https://coverartarchive.org/release-group/${rgId}/front-500`, rel && `https://coverartarchive.org/release/${rel.id}/front-500`]) {
    if (!url) continue;
    const head = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (head?.ok) {
      // Guarda o endereço estável do Cover Art Archive (ele redireciona para o archive.org).
      coverUrl = url;
      break;
    }
  }

  return json({
    found: true,
    title: rec.title,
    artist: credit || artist,
    album: rel?.title ?? null,
    year,
    duration: rec.length ? Math.round(rec.length / 1000) : null,
    tags: (rec.tags ?? []).sort((a, b) => b.count - a.count).slice(0, 5).map((t) => t.name),
    coverUrl,
  });
}
