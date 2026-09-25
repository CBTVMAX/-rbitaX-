"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Loader2, X } from "lucide-react";
import { downloadUrl, useSignedUrl } from "@/lib/messenger/media";
import type { Attachment } from "@/lib/messenger/types";

function Slide({ a, local }: { a: Attachment; local?: string }) {
  const signed = useSignedUrl(local ? null : a.path);
  const src = local ?? signed;
  if (!src) {
    return src === "" ? (
      <p className="text-sm text-white/60">Este arquivo não está mais disponível.</p>
    ) : (
      <Loader2 className="h-8 w-8 animate-spin text-white/60" />
    );
  }
  return a.kind === "video" ? (
    <video key={src} src={src} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg shadow-2xl" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl" draggable={false} />
  );
}

export function MediaViewer({
  items,
  locals,
  index,
  caption,
  onClose,
}: {
  items: Attachment[];
  locals?: string[];
  index: number;
  caption?: string;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);
  const [touchX, setTouchX] = useState<number | null>(null);
  const a = items[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(items.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [items.length, onClose]);

  if (!a || typeof document === "undefined") return null;

  async function download() {
    const url = await downloadUrl(a.path, a.name ?? a.path.split("/").pop());
    if (url) window.location.href = url;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (dx < -50) setI((x) => Math.min(items.length - 1, x + 1));
        if (dx > 50) setI((x) => Math.max(0, x - 1));
        setTouchX(null);
      }}
    >
      <div className="flex items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-snow">
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
        <span className="flex-1 text-sm text-snow/70">{items.length > 1 ? `${i + 1} de ${items.length}` : ""}</span>
        <button type="button" onClick={download} aria-label="Baixar" className="rounded-full p-2 hover:bg-white/10">
          <Download className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 md:px-16" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <Slide key={a.path} a={a} local={locals?.[i]} />
        {i > 0 && (
          <button
            type="button"
            onClick={() => setI(i - 1)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-snow hover:bg-white/20 md:block"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {i < items.length - 1 && (
          <button
            type="button"
            onClick={() => setI(i + 1)}
            aria-label="Próxima"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-snow hover:bg-white/20 md:block"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
      {caption && <p className="mx-auto max-w-2xl px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-sm text-snow/85">{caption}</p>}
    </div>,
    document.body
  );
}
