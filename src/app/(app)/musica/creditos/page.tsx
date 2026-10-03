import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { genreLabel } from "@/lib/music";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Créditos das músicas · Órbita X" };

type Row = { album: string | null; artist: string; genre: string | null; license: string | null; licenseUrl: string | null; sourceUrl: string | null };

/** Atribuição exigida pelas licenças Creative Commons: artista, obra, licença e fonte. */
export default async function MusicCreditsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("Track")
    .select("album, artist, genre, license, licenseUrl, sourceUrl")
    .eq("isOfficial", true)
    .is("youtubeId", null)
    .order("genre")
    .order("album")
    .limit(2000);

  const albums = new Map<string, Row & { artists: Set<string> }>();
  for (const r of (data as Row[] | null) ?? []) {
    const key = r.sourceUrl ?? `${r.album}|${r.artist}`;
    const entry = albums.get(key) ?? { ...r, artists: new Set<string>() };
    entry.artists.add(r.artist);
    albums.set(key, entry);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 py-4 md:px-4 md:py-6">
      <div className="flex items-center gap-3">
        <Link href="/musica" aria-label="Voltar para Música" className="rounded-full p-1.5 text-white/80 transition hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Créditos e licenças</h1>
          <p className="text-sm text-white/60">Músicas do catálogo Órbita X e quem as criou.</p>
        </div>
      </div>
      <p className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 text-sm leading-relaxed text-white/65">
        Os hits e clássicos tocam completos pelo player oficial do YouTube, a partir dos canais oficiais dos artistas e gravadoras — o
        YouTube licencia essas músicas e repassa os direitos. As demais músicas do catálogo são de artistas independentes e foram publicadas por eles com licenças Creative Commons que permitem
        compartilhar a obra (CC BY, CC BY-SA e CC0) ou estão em domínio público. Os arquivos são servidos pelo Internet Archive. Se você é autor
        de alguma obra e quer que ela seja retirada, fale com a equipe pelo{" "}
        <Link href="/contato" className="text-orbit-cyan hover:underline">contato</Link>.
      </p>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
        {[...albums.values()].map((a, i) => (
          <div key={i} className="flex items-start gap-3 border-t border-white/10 px-4 py-3 first:border-t-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{a.album ?? "Single"}</p>
              <p className="truncate text-xs text-white/55">{[...a.artists].slice(0, 4).join(", ")}{a.artists.size > 4 ? "…" : ""} · {genreLabel(a.genre)}</p>
            </div>
            <div className="shrink-0 text-right text-xs">
              {a.licenseUrl ? (
                <a href={a.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-orbit-cyan hover:underline">{a.license}</a>
              ) : (
                <span className="text-white/60">{a.license}</span>
              )}
              {a.sourceUrl && (
                <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center justify-end gap-1 text-white/45 hover:text-white">
                  Fonte <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
