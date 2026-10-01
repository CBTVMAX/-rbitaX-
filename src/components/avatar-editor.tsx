"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Avatar editor. The picture is saved in its own aspect ratio, so the profile shows exactly the
 * framing chosen here — no automatic center crop, no stretching. Covers (fixed 8:3, no rotation)
 * use CoverCropDialog instead.
 */
const OUTPUT_MAX_WIDTH = 1024;
const MAX_ZOOM = 3;

type Crop = { x: number; y: number; w: number };
type Rotation = 0 | 90 | 180 | 270;
type Size = { w: number; h: number };

/** Image size after the chosen rotation, which is the space the crop is clamped to. */
function rotatedSize(nat: Size, rotation: Rotation): Size {
  return rotation % 180 === 0 ? nat : { w: nat.h, h: nat.w };
}

function baseWidth(nat: Size, ratio: number) {
  return Math.min(nat.w, nat.h * ratio);
}

function clampCrop(c: Crop, nat: Size, ratio: number): Crop {
  const base = baseWidth(nat, ratio);
  const w = Math.min(Math.max(c.w, base / MAX_ZOOM), base);
  const h = w / ratio;
  return {
    w,
    x: Math.min(Math.max(c.x, 0), Math.max(0, nat.w - w)),
    y: Math.min(Math.max(c.y, 0), Math.max(0, nat.h - h)),
  };
}

/**
 * Draws the chosen framing. Shared by the live preview and the exported file, so what the user
 * previews is exactly what gets saved. `rot` rotates around the image center.
 */
function paintAvatar(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  nat: Size,
  crop: Crop,
  ratio: number,
  rot: Rotation,
  outW: number,
  outH: number
) {
  ctx.clearRect(0, 0, outW, outH);
  ctx.imageSmoothingQuality = "high";

  const rad = (rot * Math.PI) / 180;
  const cropH = crop.w / ratio;
  // The crop is measured in source pixels and the canvas in device pixels, so each axis has to be
  // scaled on its own. A single uniform scale cannot place them: the crop offset is in source units
  // and would be scaled a second time, throwing the image off-canvas (a 4000x3000 photo landed at
  // x = -960 on a 1200px canvas, entirely clipped away).
  const sx = outW / crop.w;
  const sy = outH / cropH;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, outW, outH);
  ctx.clip();
  // The crop is a window in the ROTATED space, so the photo is first turned about its own centre
  // and only then is that window placed on the canvas — rotating after placing would spin the
  // framing instead of the photo.
  ctx.scale(sx, sy);
  ctx.translate(-crop.x, -crop.y);
  ctx.translate(nat.w / 2, nat.h / 2);
  ctx.rotate(rad);
  ctx.translate(-nat.w / 2, -nat.h / 2);
  ctx.drawImage(img, 0, 0, nat.w, nat.h);
  ctx.restore();
}

/**
 * Avatars are displayed in a circle, so the editor always frames a square: what the user picks
 * inside the guide circle is exactly what shows in the profile, with no crop applied later.
 */
const AVATAR_RATIO = 1;

/** Margin of photo shown around the circle, as a share of the crop width (circle = ~82% of the stage). */
const STAGE_PAD = 0.11;

function expandCrop(c: Crop): Crop {
  const pad = c.w * STAGE_PAD;
  return { x: c.x - pad, y: c.y - pad, w: c.w + pad * 2 };
}

/** Paints a canvas at its CSS size times the device pixel ratio. */
function paintCanvas(c: HTMLCanvasElement | null, size: number, img: HTMLImageElement, nat: Size, crop: Crop, rot: Rotation) {
  if (!c || size < 10) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  const ctx = c.getContext("2d");
  if (ctx) paintAvatar(ctx, img, nat, crop, AVATAR_RATIO, rot, c.width, c.height);
}

/**
 * Seleção da miniatura, como no VK: a foto inteira com o círculo por cima (fora dele fica escuro),
 * arrastar/zoom/girar, e ao lado o "exemplo de avatar" mostrando como a foto fica junto do nome.
 */
export function AvatarEditor({
  file,
  name,
  confirmLabel = "Continuar",
  onCancel,
  onConfirm,
}: {
  file: File;
  /** Nome mostrado no exemplo de avatar. */
  name?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob, ratio: number) => Promise<void>;
}) {
  const [nat, setNat] = useState<Size | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1 });
  const [rotation, setRotation] = useState<Rotation>(0);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageCanvas = useRef<HTMLCanvasElement>(null);
  const previewBig = useRef<HTMLCanvasElement>(null);
  const previewSmall = useRef<HTMLCanvasElement>(null);
  const previewRow = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ px: number; py: number; crop: Crop } | null>(null);
  // Two-finger pinch on touch devices.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef<number | null>(null);
  const ratio = AVATAR_RATIO;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const n = { w: img.naturalWidth, h: img.naturalHeight };
      setNat(n);
      const w = baseWidth(n, AVATAR_RATIO);
      setCrop({ w, x: (n.w - w) / 2, y: (n.h - w) / 2 });
    };
    img.onerror = () => setError("Não foi possível abrir essa imagem. Use JPG, PNG ou WebP.");
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Esc fecha; a página por trás não rola enquanto o editor está aberto.
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancelRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const applyZoom = useCallback(
    (next: number) => {
      if (!nat) return;
      const z = Math.min(Math.max(next, 1), MAX_ZOOM);
      setZoom(z);
      setCrop((c) => {
        const rs = rotatedSize(nat, rotation);
        const w = baseWidth(rs, ratio) / z;
        const cx = c.x + c.w / 2;
        const cy = c.y + c.w / ratio / 2;
        return clampCrop({ w, x: cx - w / 2, y: cy - w / ratio / 2 }, rs, ratio);
      });
    },
    [nat, rotation, ratio]
  );

  function onRotate() {
    if (!nat) return;
    const next = ((rotation + 90) % 360) as Rotation;
    setRotation(next);
    // Keep the same visible center after the turn.
    setCrop((c) => {
      const rs = rotatedSize(nat, next);
      const cx = c.x + c.w / 2;
      const cy = c.y + c.w / ratio / 2;
      const w = Math.min(c.w, baseWidth(rs, ratio));
      return clampCrop({ w, x: cx - w / 2, y: cy - w / ratio / 2 }, rs, ratio);
    });
    setZoom(1);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { px: e.clientX, py: e.clientY, crop };
    pinchDist.current = null;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current) applyZoom(zoom * (dist / pinchDist.current));
      pinchDist.current = dist;
      drag.current = null;
      return;
    }
    if (!drag.current || !nat || !stageRef.current) return;
    // The stage shows the crop plus a margin, so one screen pixel covers expandCrop().w / width source pixels.
    const perPx = expandCrop(drag.current.crop).w / stageRef.current.clientWidth;
    const dx = (e.clientX - drag.current.px) * perPx;
    const dy = (e.clientY - drag.current.py) * perPx;
    setCrop(clampCrop({ w: drag.current.crop.w, x: drag.current.crop.x - dx, y: drag.current.crop.y - dy }, rotatedSize(nat, rotation), ratio));
  }

  function endPointer(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinchDist.current = null;
    drag.current = null;
    // Lifting one finger of a pinch continues as a drag from where that finger is.
    const rest = [...pointers.current.values()][0];
    if (rest) drag.current = { px: rest.x, py: rest.y, crop };
  }

  function onWheel(e: React.WheelEvent) {
    applyZoom(zoom - e.deltaY * 0.0015);
  }

  async function toBlob(w: number, h: number): Promise<Blob | null> {
    const img = imgRef.current;
    if (!img || !nat) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    paintAvatar(ctx, img, nat, crop, ratio, rotation, w, h);
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => (b ? resolve(b) : canvas.toBlob(resolve, "image/jpeg", 0.9)), "image/webp", 0.9)
    );
  }

  async function confirm() {
    if (!nat) return;
    setSaving(true);
    setError(null);
    const outW = Math.round(Math.min(OUTPUT_MAX_WIDTH, crop.w));
    const blob = await toBlob(outW, Math.round(outW / ratio));
    if (!blob) {
      setSaving(false);
      return setError("Não foi possível preparar a imagem.");
    }
    try {
      await onConfirm(blob, ratio);
    } catch {
      setError("Não foi possível salvar a foto. Tente novamente.");
    }
    setSaving(false);
  }

  // Palco (foto com margem em volta do círculo) e as miniaturas usam o mesmo desenho do arquivo final.
  useEffect(() => {
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !nat || !stage) return;
    const paint = () => {
      paintCanvas(stageCanvas.current, stage.clientWidth, img, nat, expandCrop(crop), rotation);
      for (const c of [previewBig.current, previewSmall.current, previewRow.current]) if (c) paintCanvas(c, c.clientWidth, img, nat, crop, rotation);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [nat, crop, rotation]);

  const lowRes = nat && crop.w < 400;
  const displayName = name?.trim() || "Seu nome";

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black text-snow md:items-center md:justify-center md:bg-black/75 md:p-6 md:backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Seleção de miniatura"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col md:max-w-[820px] md:flex-none md:overflow-hidden md:rounded-3xl md:border md:border-white/10 md:bg-space-surface md:text-white md:shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:border-b md:border-white/[0.08] md:px-6 md:py-4">
          <button type="button" onClick={onCancel} aria-label="Cancelar" className="flex h-10 w-10 items-center justify-center rounded-full text-snow/80 hover:bg-white/10 md:order-last md:ml-auto md:h-9 md:w-9 md:text-white/60">
            <X className="h-6 w-6 md:h-5 md:w-5" />
          </button>
          <h2 className="text-[17px] font-semibold md:text-lg">Seleção de miniatura</h2>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:gap-6 md:overflow-visible md:p-6">
          <div className="flex flex-1 flex-col md:min-w-0">
            <p className="hidden text-sm text-white/55 md:mb-4 md:block">
              Escolha a área que vai aparecer nas publicações, nos comentários e nas mensagens. Arraste a foto e use o zoom para ajustar.
            </p>
            {error && <p className="mx-4 mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 md:mx-0">{error}</p>}

            <div className="flex flex-1 items-center justify-center md:flex-none">
              <div
                ref={stageRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
                onWheel={onWheel}
                className="relative aspect-square w-full max-w-[min(100vw,58dvh)] cursor-grab touch-none select-none overflow-hidden bg-[#0d0f1a] active:cursor-grabbing md:max-w-[440px] md:rounded-2xl"
              >
                <canvas ref={stageCanvas} className="absolute inset-0 h-full w-full" />
                {!nat && !error && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                  </span>
                )}
                {nat && (
                  <>
                    {/* Fora do círculo fica escuro; dentro é exatamente o que vira o avatar. */}
                    <span aria-hidden className="pointer-events-none absolute inset-[9%] rounded-full border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.68)]" />
                  </>
                )}
              </div>
            </div>

            <div className="mx-auto mt-3 flex w-full max-w-[440px] items-center gap-3 px-4 md:px-0">
              <button type="button" onClick={() => applyZoom(zoom - 0.2)} aria-label="Diminuir zoom" className="text-snow/60 hover:text-snow md:text-white/60 md:hover:text-white">
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
                className="h-1.5 flex-1 cursor-pointer accent-orbit-blue"
              />
              <button type="button" onClick={() => applyZoom(zoom + 0.2)} aria-label="Aumentar zoom" className="text-snow/60 hover:text-snow md:text-white/60 md:hover:text-white">
                <ZoomIn className="h-5 w-5" />
              </button>
              <button type="button" onClick={onRotate} aria-label="Girar foto" title="Girar 90°" className="rounded-lg p-1.5 text-snow/60 hover:bg-white/10 hover:text-snow md:text-white/60 md:hover:text-white">
                <RotateCw className="h-5 w-5" />
              </button>
            </div>
            {lowRes && <p className="mx-auto mt-2 max-w-[440px] px-4 text-xs text-amber-300/90 md:px-0">Pouca resolução nesse enquadramento. Diminua o zoom ou use uma foto maior.</p>}
          </div>

          <aside className="shrink-0 px-4 pt-4 md:w-[220px] md:px-0 md:pt-0">
            {/* Computador: miniaturas em dois tamanhos, como no VK. */}
            <div className="hidden md:block">
              <p className="mb-3 text-sm font-medium text-white/70">Miniaturas</p>
              <div className="flex items-end gap-4">
                <canvas ref={previewBig} className="h-[100px] w-[100px] rounded-full bg-white/[0.06]" />
                <canvas ref={previewSmall} className="h-[50px] w-[50px] rounded-full bg-white/[0.06]" />
              </div>
            </div>
            <p className="mb-2 text-[13px] text-snow/50 md:mt-6 md:text-white/50">Exemplo de avatar</p>
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 md:bg-white/[0.04]">
              <canvas ref={previewRow} className="h-11 w-11 shrink-0 rounded-full bg-white/[0.06]" />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{displayName}</span>
                <span className="block text-[13px] text-snow/50 md:text-white/45">online agora</span>
              </span>
            </div>
          </aside>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:flex-row md:justify-end md:border-t md:border-white/[0.08] md:px-6 md:py-4">
          <button type="button" onClick={onCancel} className="h-12 rounded-2xl px-5 text-[15px] font-medium text-snow/80 hover:bg-white/10 md:h-10 md:rounded-xl md:border md:border-white/15 md:text-sm md:text-white/80">
            Voltar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!nat || saving}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-snow px-6 text-[17px] font-semibold text-[#05060f] transition active:scale-[0.99] disabled:opacity-60 md:h-10 md:rounded-xl md:bg-orbit-blue md:text-sm md:text-snow"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Salvando..." : confirmLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
