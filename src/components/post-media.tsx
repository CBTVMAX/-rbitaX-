"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Music2, X } from "lucide-react";

export type PostMediaItem = { id: string; type: string; url: string };

/**
 * Mídia de uma publicação. Mostra as fotos INTEIRAS (sem cortar), pois muita gente posta
 * arte/pôster em retrato: uma foto aparece no tamanho natural (limitada por altura); várias
 * viram um carrossel deslizável com contador "1/N" — no celular por deslize, no computador
 * com setas. Tocar abre o visualizador em tela cheia.
 */
export function PostMedia({ media }: { media: PostMediaItem[] }) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (media.length === 0) return null;

  const audio = media.filter((m) => m.type === "audio");
  const visual = media.filter((m) => m.type !== "audio");

  return (
    <div className="mb-3 space-y-2">
      {visual.length === 1 ? (
        <Single item={visual[0]} onOpen={() => setViewer(0)} />
      ) : visual.length > 1 ? (
        visual.every((m) => m.type !== "video") ? (
          <>
            {/* Celular: carrossel; computador: grade (1 grande + menores, "+N"). Tocar mostra a foto inteira. */}
            <div className="md:hidden">
              <Carousel items={visual} onOpen={setViewer} />
            </div>
            <div className="hidden md:block">
              <Grid items={visual} onOpen={setViewer} />
            </div>
          </>
        ) : (
          <Carousel items={visual} onOpen={setViewer} />
        )
      ) : null}

      {audio.map((m) => (
        <AudioPlayer key={m.id} item={m} />
      ))}

      {viewer !== null && visual.length > 0 && <Lightbox items={visual} index={viewer} setIndex={setViewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

/** Player de música numa publicação. */
function AudioPlayer({ item }: { item: PostMediaItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chat/15 text-chat">
        <Music2 className="h-5 w-5" />
      </span>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio src={item.url} controls preload="none" className="min-w-0 flex-1" />
    </div>
  );
}

function Single({ item, onOpen }: { item: PostMediaItem; onOpen: () => void }) {
  if (item.type === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={item.url} controls className="max-h-[600px] w-full rounded-xl bg-black object-contain" />
    );
  }
  return (
    <button type="button" onClick={onOpen} className="flex w-full justify-center overflow-hidden rounded-xl bg-space-card" aria-label="Abrir foto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="max-h-[600px] w-full object-contain transition hover:opacity-95" />
    </button>
  );
}

/** Carrossel: mesmo comportamento no celular (deslize) e no computador (setas). */
function Carousel({ items, onOpen }: { items: PostMediaItem[]; onOpen: (i: number) => void }) {
  const [index, setIndex] = useState(0);
  // Altura segue a proporção da primeira foto (entre 4:5 e 1.91:1), sem faixas vazias enormes.
  const [ratio, setRatio] = useState(1);
  const firstRef = useRef<HTMLImageElement>(null);
  const measure = (img: HTMLImageElement | null) => {
    if (img?.naturalWidth && img.naturalHeight) setRatio(Math.min(1.91, Math.max(0.8, img.naturalWidth / img.naturalHeight)));
  };
  // A foto pode já ter carregado antes da página ficar interativa (o onLoad não dispara de novo).
  useEffect(() => {
    if (firstRef.current?.complete) measure(firstRef.current);
  }, []);
  const ref = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  function go(dir: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: (index + dir) * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="group relative overflow-hidden rounded-xl bg-space-card">
      <div
        ref={ref}
        onScroll={onScroll}
        style={{ aspectRatio: String(ratio) }}
        className="flex max-h-[70vh] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((m, i) => (
          <div key={m.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
            {m.type === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={m.url} controls className="max-h-full w-full bg-black object-contain" />
            ) : (
              <button type="button" onClick={() => onOpen(i)} className="flex h-full w-full items-center justify-center" aria-label={`Abrir foto ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt=""
                  className="h-full w-full object-contain"
                  ref={i === 0 ? firstRef : undefined}
                  onLoad={i === 0 ? (e) => measure(e.currentTarget) : undefined}
                />
              </button>
            )}
          </div>
        ))}
      </div>

      <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
        {index + 1}/{items.length}
      </span>

      {/* Setas (computador) */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Foto anterior"
          className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100 md:block"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Próxima foto"
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100 md:block"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
        {items.map((m, i) => (
          <span key={m.id} className={clsx("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/50")} />
        ))}
      </div>
    </div>
  );
}

/** Visualizador em tela cheia com setas, contador e navegação por teclado/deslize. */
function Lightbox({ items, index, setIndex, onClose }: { items: PostMediaItem[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setIndex((index + d + items.length) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  const m = items[index];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
      role="dialog"
      aria-modal="true"
    >
      <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
        {index + 1} / {items.length}
      </span>

      {items.length > 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:left-6">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <div className="max-h-[90vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        {m.type === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={m.url} controls autoPlay className="max-h-[90vh] max-w-[92vw] rounded-lg" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.url} alt="" className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain" />
        )}
      </div>

      {items.length > 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Próxima" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:right-6">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

/** Grade do computador (como no mockup): 1 grande à esquerda e as demais à direita, com "+N". */
function Grid({ items, onOpen }: { items: PostMediaItem[]; onOpen: (i: number) => void }) {
  const tile = (i: number, className: string, more = 0) => {
    const m = items[i];
    return (
      <button key={m.id} type="button" onClick={() => onOpen(i)} aria-label={`Abrir foto ${i + 1}`} className={clsx("relative block overflow-hidden rounded-lg bg-space-card", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.url} alt="" className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
        {more > 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-snow">+{more}</span>
        )}
      </button>
    );
  };
  if (items.length === 2) {
    return <div className="grid h-[340px] grid-cols-2 gap-1.5">{[tile(0, "h-full"), tile(1, "h-full")]}</div>;
  }
  const extra = items.length - 4;
  return (
    <div className="grid h-[360px] grid-cols-[3fr_2fr] gap-1.5">
      {tile(0, "h-full")}
      <div className="grid min-h-0 grid-rows-2 gap-1.5">
        {tile(1, "h-full")}
        {items.length === 3 ? (
          tile(2, "h-full")
        ) : (
          <div className="grid min-h-0 grid-cols-2 gap-1.5">
            {tile(2, "h-full")}
            {tile(3, "h-full", extra)}
          </div>
        )}
      </div>
    </div>
  );
}
