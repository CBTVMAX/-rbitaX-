"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Move, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

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

export function AvatarEditor({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob, ratio: number) => Promise<void>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<Size | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 1 });
  const [rotation, setRotation] = useState<Rotation>(0);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; crop: Crop } | null>(null);
  // Two-finger pinch on touch devices.
  const pinch = useRef<Map<number, { x: number; y: number }> | null>(null);

  // State for the img element loaded via URL
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let currentUrl: string | null = null;

    // Create URL when file changes
    currentUrl = URL.createObjectURL(file);
    setSrc(currentUrl);
    setImgLoaded(false);
    setCrop({ x: 0, y: 0, w: 1 });
    setRotation(0);
    setZoom(1);
    setError(null);

    // Preload image to get dimensions
    const img = new Image();
    img.onload = () => {
      if (!mounted) return;
      imgRef.current = img;
      const n = { w: img.naturalWidth, h: img.naturalHeight };
      setNat(n);
      // Initialize crop to center of image
      const r = AVATAR_RATIO;
      const rs = rotatedSize(n, 0);
      const w = baseWidth(rs, r);
      setCrop({ w, x: (rs.w - w) / 2, y: (rs.h - w / r) / 2 });
    };
    img.onerror = () => {
      if (!mounted) return;
      setError("Não foi possível abrir essa imagem. Use JPG, PNG ou WebP.");
    };
    img.src = currentUrl;

    return () => {
      mounted = false;
      // Only revoke if loading is done (otherwise browser may complain)
      if (img.complete && img.naturalWidth > 0) {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
      }
      // If still loading, revoke after a short delay
      if (currentUrl) {
        img.onload = null;
        img.onerror = null;
        setTimeout(() => {
          try { URL.revokeObjectURL(currentUrl!); } catch { /* already revoked */ }
        }, 100);
      }
    };
  }, [file]);

  // Ratio of the rotated image — a 90° turn turns a portrait into a landscape avatar.
  const ratio = nat ? AVATAR_RATIO : 1;

  const applyZoom = useCallback(
    (next: number) => {
      if (!nat) return;
      const r = AVATAR_RATIO;
      const z = Math.min(Math.max(next, 1), MAX_ZOOM);
      setZoom(z);
      setCrop((c) => {
        const w = baseWidth(rotatedSize(nat, rotation), r) / z;
        const cx = c.x + c.w / 2;
        const cy = c.y + c.w / r / 2;
        return clampCrop({ w, x: cx - w / 2, y: cy - w / r / 2 }, rotatedSize(nat, rotation), r);
      });
    },
    [nat, rotation]
  );

  function onRotate() {
    if (!nat) return;
    const next = ((rotation + 90) % 360) as Rotation;
    setRotation(next);
    // Keep the same visible center after the turn.
    setCrop((c) => {
      const rs = rotatedSize(nat, next);
      const r = AVATAR_RATIO;
      const cx = c.x + c.w / 2;
      const cy = c.y + c.w / AVATAR_RATIO / 2;
      const w = Math.min(c.w, baseWidth(rs, r));
      return clampCrop({ w, x: cx - w / 2, y: cy - w / r / 2 }, rs, r);
    });
    setZoom(1);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, crop };
    if (!pinch.current) pinch.current = new Map();
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pinch.current) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pinch.current.size === 2 && nat) {
      const [a, b] = [...pinch.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const prev = (pinch.current as Map<number, unknown> & { _dist?: number })._dist;
      if (prev) applyZoom(zoom * (dist / prev));
      (pinch.current as Map<number, unknown> & { _dist?: number })._dist = dist;
      return;
    }

    if (!drag.current || !nat || !stageRef.current) return;
    const perPx = drag.current.crop.w / stageRef.current.clientWidth;
    const dx = (e.clientX - drag.current.px) * perPx;
    const dy = (e.clientY - drag.current.py) * perPx;
    const r = AVATAR_RATIO;
    setCrop(clampCrop({ w: drag.current.crop.w, x: drag.current.crop.x - dx, y: drag.current.crop.y - dy }, rotatedSize(nat, rotation), r));
  }

  function endPointer(e: React.PointerEvent) {
    if (pinch.current) {
      pinch.current.delete(e.pointerId);
      if (pinch.current.size < 2) (pinch.current as Map<number, unknown> & { _dist?: number })._dist = undefined;
    }
    if (drag.current) drag.current = null;
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
    if (!nat || !crop?.w || crop.w < 10) return;
    setSaving(true);
    setError(null);
    const outW = Math.round(Math.min(OUTPUT_MAX_WIDTH, crop.w));
    const outH = Math.round(outW / ratio);
    const blob = await toBlob(outW, outH);
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

  // Live preview: the editor canvas and the two thumbnails, drawn from the exact same state as the
  // exported file, so what is previewed is literally what gets saved. Each canvas is sized from the
  // box it has to fill rather than from an assumed size, which keeps the framing exact (the stage is
  // square but clamped by `maxHeight`, so a fixed square canvas would be stretched). A box that is
  // not laid out yet is skipped instead of collapsed to 1px, and a ResizeObserver repaints when the
  // box changes — rotation to a landscape photo, window resize, device rotation.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !nat || !src) return;
    const ids = ["#editor-canvas", "#preview-desktop", "#preview-mobile"];
    const paint = () => {
      for (const id of ids) {
        const c = document.getElementById(id) as HTMLCanvasElement | null;
        if (!c) continue;
        const box = c.parentElement?.getBoundingClientRect();
        const w = Math.round(box?.width ?? 0);
        const h = Math.round(box?.height ?? 0);
        // Not laid out (width 0 mid-layout): skip, and let the ResizeObserver paint it once it is.
        if (w < 1 || h < 1) continue;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        const ctx = c.getContext("2d");
        if (ctx) paintAvatar(ctx, img, nat, crop, ratio, rotation, c.width, c.height);
      }
    };
    paint();
    const ro = new ResizeObserver(paint);
    for (const id of ids) {
      const parent = document.getElementById(id)?.parentElement;
      if (parent) ro.observe(parent);
    }
    return () => ro.disconnect();
  }, [src, nat, crop, ratio, rotation]);

  const lowRes = nat && crop.w < 700;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Ajustar foto">
      <div className="max-h-[100dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-white/10 bg-space-surface p-4 shadow-2xl md:rounded-3xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white md:text-xl">Ajustar foto</h2>
            <p className="text-xs text-white/55 md:text-sm">
              Arraste para posicionar, use o zoom e gire se precisar. É assim que a foto vai aparecer no seu perfil.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Fechar" className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onWheel={onWheel}
          className="relative w-full cursor-grab touch-none overflow-hidden rounded-2xl border border-white/15 bg-space-card active:cursor-grabbing"
          style={{ aspectRatio: String(ratio), maxHeight: "58vh", marginInline: "auto" }}
        >
          {src && nat ? (
            <>
              {/* Image with CSS transform for position, scale, and rotation */}
              <img
                src={src}
                alt="Foto para ajustar"
                className="pointer-events-none"
                onLoad={(e) => {
                  setImgLoaded(true);
                  imgRef.current = e.currentTarget;
                }}
                onError={() => setError("Não foi possível abrir essa imagem.")}
                style={{
                  position: "absolute",
                  // Center in container
                  left: "50%",
                  top: "50%",
                  // Transform to position, scale, and rotate
                  // Offset = (crop center - image center) * zoom
                  // Positive offset moves image right/down, negative moves left/up
                  transform: `translate(
                    calc(-50% + ${(crop.x + crop.w / 2 - nat.w / 2) * zoom}px),
                    calc(-50% + ${(crop.y + crop.w / 2 - nat.h / 2) * zoom}px)
                  ) scale(${zoom}) rotate(${rotation}deg)`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
              <canvas id="editor-canvas" className="hidden" />
            </>
          ) : (
            !error && <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/50" />
          )}
          <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-space-bg/70 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur">
            <Move className="h-3.5 w-3.5" /> Arraste para posicionar
          </span>
          {/* The guide circle: what stays visible in the profile, so the user frames against it. */}
          {src && nat && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                // Scrim outside the circle
                background: "radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.6) 35.5%, rgba(0,0,0,0.6) 100%)",
              }}
            />
          )}
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
          <button
            type="button"
            onClick={onRotate}
            aria-label="Girar foto"
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
            title="Girar 90°"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
        {lowRes && (
          <p className="mt-2 text-xs text-amber-300/90">
            A imagem ficou com pouca resolução nesse enquadramento. Para melhor qualidade, use uma imagem de pelo menos 1024 px de lado.
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5">
            Voltar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!nat || saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-orbit-gradient px-6 py-2.5 text-sm font-semibold text-snow shadow-glow disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
    ,
    document.body
  );
}
