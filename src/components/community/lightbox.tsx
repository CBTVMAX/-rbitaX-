"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

/** Full-screen photo viewer (swipe / arrows / Esc). */
export function Lightbox({ images, start, onClose, caption }: { images: { url: string; id: string }[]; start: number; onClose: () => void; caption?: React.ReactNode }) {
  const [i, setI] = useState(start);
  const [touch, setTouch] = useState<number | null>(null);
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;
  const img = images[i];
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-black/95"
      onTouchStart={(e) => setTouch(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch === null) return;
        const dx = e.changedTouches[0].clientX - touch;
        if (Math.abs(dx) > 50 && images.length > 1) go(dx < 0 ? 1 : -1);
        setTouch(null);
      }}
      role="dialog"
      aria-label="Foto em tela cheia"
    >
      <div className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="flex-1 text-sm text-white/70">{images.length > 1 ? `${i + 1} de ${images.length}` : ""}</span>
        <a href={img.url} target="_blank" rel="noopener noreferrer" download aria-label="Baixar" className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
          <Download className="h-5 w-5" />
        </a>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt="" className="max-h-full max-w-full select-none object-contain" onClick={(e) => e.stopPropagation()} />
        {images.length > 1 && (
          <>
            <button type="button" onClick={(e) => (e.stopPropagation(), go(-1))} aria-label="Anterior" className="absolute left-2 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:flex">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={(e) => (e.stopPropagation(), go(1))} aria-label="Próxima" className="absolute right-2 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:flex">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      {caption && <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-sm text-white/80">{caption}</div>}
    </div>,
    document.body
  );
}
