import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { genreLabel } from "@/lib/music";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sobre as músicas · Órbita X" };

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
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Sobre as músicas</h1>
          <p className="text-sm text-white/60">De onde vêm as músicas do Órbita X.</p>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-space-surface/80 p-4 text-sm leading-relaxed text-white/65">
        <p>
          As músicas do catálogo tocam completas e são enviadas pela <span className="text-white">equipe do Órbita X</span>, sempre
          com autorização de uso: obras próprias, licenciadas, autorizadas pelos artistas ou de uso livre.
        </p>
        <p>
          Os clipes oficiais ficam em{" "}
          <Link href="/videos" className="text-orbit-cyan hover:underline">Vídeos</Link>, no player do YouTube, a partir dos canais
          oficiais dos artistas.
        </p>
        <p>
          Em “Minhas músicas”, cada pessoa pode enviar arquivos que tenha direito de compartilhar. Se você é dono dos direitos de
          alguma obra e quer que ela seja retirada, fale com a equipe pelo{" "}
          <Link href="/contato" className="text-orbit-cyan hover:underline">contato</Link>.
        </p>
      </div>
      {albums.size > 0 && <h2 className="px-1 text-sm font-semibold text-white">Créditos e licenças</h2>}
      {albums.size > 0 && <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
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
      </div>}
    </div>
  );
}
