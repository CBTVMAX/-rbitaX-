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

  useEffect(() => {
    console.log("[avatar-editor] useEffect started, file:", file.name, "size:", file.size);
    const url = URL.createObjectURL(file);
    console.log("[avatar-editor] created object URL:", url);
    setSrc(url);

    const img = new Image();
    img.onload = () => {
      console.log("[avatar-editor] img.onload fired, naturalWidth:", img.naturalWidth, "naturalHeight:", img.naturalHeight);
      imgRef.current = img;
      const n = { w: img.naturalWidth, h: img.naturalHeight };
      console.log("[avatar-editor] setting nat:", n);
      setNat(n);
      // After rotation the image may be portrait or landscape; the ratio follows what is shown.
      const r = AVATAR_RATIO;
      const rs = rotatedSize(n, 0);
      const w = baseWidth(rs, r);
      console.log("[avatar-editor] setting crop, baseWidth:", w);
      setCrop({ w, x: (rs.w - w) / 2, y: (rs.h - w / r) / 2 });
    };
    img.onerror = (e) => {
      console.log("[avatar-editor] img.onerror:", e);
      setError("Não foi possível abrir essa imagem. Use JPG, PNG ou WebP.");
    };
    console.log("[avatar-editor] setting img.src to:", url);
    img.src = url;
    console.log("[avatar-editor] img.complete after setting src:", img.complete, "img.naturalWidth:", img.naturalWidth);
    return () => {
      img.src = "";
      img.onload = null;
      img.onerror = null;
      console.log("[avatar-editor] cleanup, img.complete:", img.complete, "naturalWidth:", img.naturalWidth);
      if (!img.complete || img.naturalWidth === 0) URL.revokeObjectURL(url);
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
    if (!nat) return;
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

  // Paint the visible editor canvas with crop/zoom/rotation
  useEffect(() => {
    if (!imgRef.current || !nat || !src || !stageRef.current) return;

    const stage = stageRef.current;
    const c = document.getElementById("editor-canvas") as HTMLCanvasElement | null;
    if (!c) return;

    const paint = () => {
      const stageBox = stage.getBoundingClientRect();
      const maxW = stageBox.width;
      const maxH = stageBox.height;

      // For square avatars, use the smaller dimension to fit
      const size = Math.min(maxW, maxH);
      if (size < 50) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(size * dpr);
      c.height = Math.round(size * dpr);
      c.style.width = `${size}px`;
      c.style.height = `${size}px`;

      const ctx = c.getContext("2d");
      if (ctx && imgRef.current) {
        paintAvatar(ctx, imgRef.current, nat, crop, ratio, rotation, c.width, c.height);
      }
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [nat, src, crop, ratio, rotation]);

  const lowRes = nat && crop.w < 700;

  console.log("[avatar-editor] render: src:", src ? "set" : "null", "nat:", nat, "error:", error);
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
          className="relative flex w-full cursor-grab touch-none items-center justify-center overflow-hidden rounded-2xl border border-white/15 active:cursor-grabbing"
          style={{ aspectRatio: String(ratio), maxHeight: "58vh", marginInline: "auto", background: "#1a1a2e" }}
        >
          {src && nat ? (
            <>
              {/* Canvas shows the actual cropped/zoomed result */}
              <canvas id="editor-canvas" className="block max-h-[58vh] w-auto" />
            </>
          ) : !src ? (
            !error && <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          ) : null}
          <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-space-bg/70 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur">
            <Move className="h-3.5 w-3.5" /> Arraste para posicionar
          </span>
          {/* The guide circle: what stays visible in the profile, so the user frames against it. */}
          {src && nat && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.6)",
                borderRadius: "inherit",
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
