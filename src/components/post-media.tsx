"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type PostMediaItem = { id: string; type: string; url: string };

/**
 * Mídia de uma publicação, no estilo das redes: no celular vira um carrossel deslizável
 * com contador "1/N" (como o VK); no computador, uma grade inteligente (1/2/3/4+ com "+N").
 * Tocar em qualquer foto abre o visualizador em tela cheia com setas.
 */
export function PostMedia({ media }: { media: PostMediaItem[] }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const n = media.length;
  if (n === 0) return null;

  return (
    <div className="mb-3">
      {n === 1 ? (
        <Single item={media[0]} onOpen={() => setViewer(0)} />
      ) : (
        <>
          <MobileCarousel items={media} onOpen={setViewer} />
          <DesktopGrid items={media} onOpen={setViewer} />
        </>
      )}
      {viewer !== null && <Lightbox items={media} index={viewer} setIndex={setViewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function Single({ item, onOpen }: { item: PostMediaItem; onOpen: () => void }) {
  if (item.type === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={item.url} controls className="max-h-[520px] w-full rounded-xl bg-black object-contain" />
    );
  }
  return (
    <button type="button" onClick={onOpen} className="block w-full overflow-hidden rounded-xl" aria-label="Abrir foto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="max-h-[520px] w-full object-cover transition hover:opacity-95" />
    </button>
  );
}

/** Celular: carrossel com scroll-snap, contador e pontos. */
function MobileCarousel({ items, onOpen }: { items: PostMediaItem[]; onOpen: (i: number) => void }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  return (
    <div className="relative md:hidden">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((m, i) => (
          <div key={m.id} className="w-full shrink-0 snap-center">
            {m.type === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={m.url} controls className="max-h-[70vh] w-full bg-black object-contain" />
            ) : (
              <button type="button" onClick={() => onOpen(i)} className="block w-full" aria-label={`Abrir foto ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="max-h-[70vh] w-full object-cover" />
              </button>
            )}
          </div>
        ))}
      </div>
      <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
        {index + 1}/{items.length}
      </span>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
        {items.map((m, i) => (
          <span key={m.id} className={clsx("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/50")} />
        ))}
      </div>
    </div>
  );
}

/** Computador: grade inteligente 1/2/3/4+ com "+N" na última. */
function DesktopGrid({ items, onOpen }: { items: PostMediaItem[]; onOpen: (i: number) => void }) {
  const n = items.length;
  const show = items.slice(0, 4);

  const Tile = ({ i, className }: { i: number; className?: string }) => {
    const m = items[i];
    const extra = n > 4 && i === 3;
    return (
      <button type="button" onClick={() => onOpen(i)} className={clsx("group relative block overflow-hidden bg-white/[0.05]", className)} aria-label={`Abrir foto ${i + 1}`}>
        {m.type === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={m.url} className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        )}
        {extra && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white backdrop-blur-[1px]">
            +{n - 4}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="hidden overflow-hidden rounded-xl md:block">
      {n === 2 && (
        <div className="grid aspect-[2/1] grid-cols-2 gap-1">
          <Tile i={0} className="h-full w-full" />
          <Tile i={1} className="h-full w-full" />
        </div>
      )}
      {n === 3 && (
        <div className="grid aspect-[3/2] grid-cols-[2fr_1fr] grid-rows-2 gap-1">
          <Tile i={0} className="row-span-2 h-full w-full" />
          <Tile i={1} className="h-full w-full" />
          <Tile i={2} className="h-full w-full" />
        </div>
      )}
      {n >= 4 && (
        <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1">
          {show.map((m, i) => (
            <Tile key={m.id} i={i} className="h-full w-full" />
          ))}
        </div>
      )}
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:left-6"
        >
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(1); }}
          aria-label="Próxima"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:right-6"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
