"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Monitor, Move, Smartphone, User, X, ZoomIn, ZoomOut } from "lucide-react";

// Every cover in Órbita X is stored and displayed at this ratio (e.g. 2000×750),
// so the framing chosen here is exactly what shows on desktop and mobile.
export const COVER_RATIO = 8 / 3;
const OUTPUT_MAX_WIDTH = 2000;
const MAX_ZOOM = 3;

type Crop = { x: number; y: number; w: number };

function baseWidth(natW: number, natH: number) {
  return Math.min(natW, natH * COVER_RATIO);
}

function clampCrop(c: Crop, natW: number, natH: number): Crop {
  const w = Math.min(Math.max(c.w, baseWidth(natW, natH) / MAX_ZOOM), baseWidth(natW, natH));
  const h = w / COVER_RATIO;
  return {
    w,
    x: Math.min(Math.max(c.x, 0), natW - w),
    y: Math.min(Math.max(c.y, 0), natH - h),
  };
}

/** Renders the chosen crop inside a frame of any width (same math for editor and previews). */
function CroppedImage({ src, nat, crop }: { src: string; nat: { w: number; h: number }; crop: Crop }) {
  const scale = 100 / crop.w; // % of frame width per source pixel
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute max-w-none select-none"
      style={{
        width: `${nat.w * scale}%`,
        left: `${-crop.x * scale}%`,
        top: `${(-crop.y * scale * COVER_RATIO)}%`,
      }}
    />
  );
}

export function CoverCropDialog({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1 });
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; crop: Crop } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const n = { w: img.naturalWidth, h: img.naturalHeight };
      setNat(n);
      const w = baseWidth(n.w, n.h);
      setCrop({ w, x: (n.w - w) / 2, y: (n.h - w / COVER_RATIO) / 2 });
    };
    img.onerror = () => setError("Não foi possível abrir essa imagem. Use JPG, PNG ou WebP.");
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const applyZoom = useCallback(
    (next: number) => {
      if (!nat) return;
      const z = Math.min(Math.max(next, 1), MAX_ZOOM);
      setZoom(z);
      setCrop((c) => {
        const w = baseWidth(nat.w, nat.h) / z;
        const cx = c.x + c.w / 2;
        const cy = c.y + c.w / COVER_RATIO / 2;
        return clampCrop({ w, x: cx - w / 2, y: cy - w / COVER_RATIO / 2 }, nat.w, nat.h);
      });
    },
    [nat]
  );

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, crop };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !nat || !frameRef.current) return;
    const perPx = drag.current.crop.w / frameRef.current.clientWidth;
    const dx = (e.clientX - drag.current.px) * perPx;
    const dy = (e.clientY - drag.current.py) * perPx;
    setCrop(clampCrop({ w: drag.current.crop.w, x: drag.current.crop.x - dx, y: drag.current.crop.y - dy }, nat.w, nat.h));
  }

  function onWheel(e: React.WheelEvent) {
    applyZoom(zoom - e.deltaY * 0.0015);
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !nat) return;
    setSaving(true);
    setError(null);
    const outW = Math.round(Math.min(OUTPUT_MAX_WIDTH, crop.w));
    const outH = Math.round(outW / COVER_RATIO);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSaving(false);
      return setError("Seu navegador não conseguiu preparar a imagem.");
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.w / COVER_RATIO, 0, 0, outW, outH);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => (b ? resolve(b) : canvas.toBlob(resolve, "image/jpeg", 0.9)), "image/webp", 0.9)
    );
    if (!blob) {
      setSaving(false);
      return setError("Não foi possível preparar a imagem.");
    }
    try {
      await onConfirm(blob);
    } catch {
      setError("Não foi possível salvar a capa. Tente novamente.");
    }
    setSaving(false);
  }

  const lowRes = nat && crop.w < 1000;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Ajustar capa">
      <div className="max-h-[100dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-white/10 bg-space-surface p-4 shadow-2xl md:rounded-3xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white md:text-xl">Ajustar capa</h2>
            <p className="text-xs text-white/55 md:text-sm">
              Arraste para enquadrar e use o zoom. É assim que a capa vai aparecer no computador e no celular.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Fechar" className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={onWheel}
          className="relative aspect-[8/3] w-full cursor-grab touch-none overflow-hidden rounded-2xl border border-white/15 bg-space-card active:cursor-grabbing"
        >
          {src && nat ? (
            <CroppedImage src={src} nat={nat} crop={crop} />
          ) : (
            !error && <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/50" />
          )}
          <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-space-bg/70 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur">
            <Move className="h-3.5 w-3.5" /> Arraste para posicionar
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => applyZoom(zoom - 0.2)} aria-label="Diminuir zoom" className="text-white/60 hover:text-white">
            <ZoomOut className="h-5 w-5" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1.5 flex-1 cursor-pointer accent-orbit-purple"
          />
          <button type="button" onClick={() => applyZoom(zoom + 0.2)} aria-label="Aumentar zoom" className="text-white/60 hover:text-white">
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
        {lowRes && (
          <p className="mt-2 text-xs text-amber-300/90">
            A imagem ficou com pouca resolução nesse enquadramento. Para melhor qualidade, use uma imagem de pelo menos 2000×750.
          </p>
        )}

        {src && nat && (
          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_200px] md:items-end">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/70">
                <Monitor className="h-4 w-4" /> Computador
              </p>
              <div className="rounded-2xl border border-white/10 bg-space-bg/60 p-2">
                <div className="relative aspect-[8/3] w-full overflow-hidden rounded-xl">
                  <CroppedImage src={src} nat={nat} crop={crop} />
                </div>
                <div className="flex items-end gap-3 px-3 pb-2">
                  <span className="relative z-10 -mt-8 flex h-16 w-16 shrink-0 items-end justify-center overflow-hidden rounded-full border-4 border-space-bg bg-space-card ring-2 ring-orbit-purple/70">
                    <User className="mb-1 h-8 w-8 text-orbit-blue/60" />
                  </span>
                  <div className="space-y-1.5 pb-1">
                    <span className="block h-2.5 w-28 rounded bg-white/25" />
                    <span className="block h-2 w-20 rounded bg-white/15" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-auto w-[200px]">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/70">
                <Smartphone className="h-4 w-4" /> Celular
              </p>
              <div className="rounded-[1.6rem] border-4 border-white/15 bg-space-bg p-1.5">
                <div className="relative aspect-[8/3] w-full overflow-hidden rounded-lg">
                  <CroppedImage src={src} nat={nat} crop={crop} />
                </div>
                <div className="px-2 pb-3">
                  <span className="relative z-10 -mt-6 flex h-12 w-12 items-end justify-center overflow-hidden rounded-full border-[3px] border-space-bg bg-space-card ring-2 ring-orbit-purple/70">
                    <User className="mb-0.5 h-6 w-6 text-orbit-blue/60" />
                  </span>
                  <span className="mt-2 block h-2 w-24 rounded bg-white/25" />
                  <span className="mt-1.5 block h-1.5 w-16 rounded bg-white/15" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5">
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!nat || saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Salvando..." : "Aplicar capa"}
          </button>
        </div>
      </div>
    </div>
    ,
    document.body
  );
}
