"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { ExternalLink, Play, Search, SkipForward, X } from "lucide-react";
import { genreLabel, GENRES, normalize } from "@/lib/music";

export type MusicClip = { id: string; title: string; artist: string; genre: string | null; youtubeId: string };

const PAGE = 36;

/** Clipes oficiais do catálogo, assistidos no player do YouTube em tamanho grande. */
export function MusicClips({ clips, initialVideo }: { clips: MusicClip[]; initialVideo?: string | null }) {
  const [genre, setGenre] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  // Clipe vindo da Música (?v=): do catálogo, ou um link que a pessoa adicionou em "Minhas músicas".
  const [active, setActive] = useState<MusicClip | null>(() => {
    if (!initialVideo || !/^[A-Za-z0-9_-]{11}$/.test(initialVideo)) return null;
    return clips.find((c) => c.youtubeId === initialVideo) ?? { id: initialVideo, title: "Clipe", artist: "YouTube", genre: null, youtubeId: initialVideo };
  });
  const stageRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => GENRES.filter((g) => clips.some((c) => c.genre === g.id)), [clips]);
  const list = useMemo(() => {
    const q = normalize(query.trim());
    return clips.filter(
      (c) => (genre === "all" || c.genre === genre) && (!q || normalize(`${c.title} ${c.artist}`).includes(q))
    );
  }, [clips, genre, query]);

  useEffect(() => {
    if (active) stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  function next() {
    if (!active) return;
    const pool = list.length ? list : clips;
    const i = pool.findIndex((c) => c.id === active.id);
    setActive(pool[(i + 1) % pool.length] ?? null);
  }

  return (
    <div>
      {active && (
        <div ref={stageRef} className="mb-5 scroll-mt-20 overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
          <div className="aspect-video w-full bg-black">
            <iframe
              key={active.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
              title={`${active.artist} — ${active.title}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-white">{active.title}</p>
              <p className="truncate text-xs text-white/55">
                {active.artist}
                {active.genre ? ` · ${genreLabel(active.genre)}` : ""}
              </p>
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${active.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir no YouTube"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-3.5 py-2 text-xs font-semibold text-snow shadow-glow"
            >
              <SkipForward className="h-3.5 w-3.5" /> Próximo
            </button>
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Fechar clipe"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <label className="relative mb-3 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => (setQuery(e.target.value), setLimit(PAGE))}
          placeholder="Buscar clipe ou artista"
          className="w-full rounded-full border border-white/10 bg-space-surface/80 py-2.5 pl-9 pr-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-orbit-purple"
        />
      </label>

      <div className="orbit-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "all", label: "Todos" }, ...genres].map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => (setGenre(g.id), setLimit(PAGE))}
            className={clsx(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
              genre === g.id ? "border-transparent bg-orbit-gradient text-snow" : "border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <p className="mb-2 px-1 text-xs text-white/45">
        {list.length} {list.length === 1 ? "clipe" : "clipes"}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        {list.slice(0, limit).map((c) => (
          <button key={c.id} type="button" onClick={() => setActive(c)} className="group text-left">
            <span className={clsx("relative block aspect-video overflow-hidden rounded-xl bg-white/[0.06]", active?.id === c.id && "ring-2 ring-orbit-cyan")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${c.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
                  <Play className="ml-0.5 h-5 w-5" />
                </span>
              </span>
            </span>
            <span className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-white">{c.title}</span>
            <span className="block truncate text-xs text-white/45">{c.artist}</span>
          </button>
        ))}
      </div>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + PAGE * 2)} className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-orbit-cyan hover:bg-white/[0.04]">
          Mostrar mais ({list.length - limit} restantes)
        </button>
      )}
      {!list.length && <p className="py-10 text-center text-sm text-white/45">Nenhum clipe encontrado.</p>}
    </div>
  );
}
