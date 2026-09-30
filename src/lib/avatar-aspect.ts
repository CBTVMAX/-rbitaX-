/**
 * Avatar aspect ratio, encoded in the uploaded file name by saveAvatar (`<uuid>_3x4.webp`).
 * Reading it from the URL keeps the display working everywhere without a schema change.
 * Anything without the marker is treated as square, which is how pre-existing avatars render.
 */
export function avatarAspect(url: string | null | undefined): number {
  if (!url) return 1;
  // Tolerates the optional frame-mode suffix, so `uuid_3x4_follow.webp` still reads as 3:4.
  const m = url.match(/_(\d+)x(\d+)(?:_(?:fit|follow|none))?\.(?:webp|jpg|jpeg|png|avif)$/i);
  if (!m) return 1;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return 1;
  return w / h;
}

// Keeps portraits and panoramas usable instead of producing absurd 1:5 strips.
export const MIN_AVATAR_RATIO = 0.5;
export const MAX_AVATAR_RATIO = 2;

/** The ratio an avatar is saved at, taken from the photo and clamped to a sane band. */
export function avatarRatio(nat: { w: number; h: number }): number {
  return Math.min(Math.max(nat.w / nat.h, MIN_AVATAR_RATIO), MAX_AVATAR_RATIO);
}

/** True when the avatar is not square, i.e. it needs rectangular chrome instead of a circle. */
export function isRectangularAvatar(url: string | null | undefined): boolean {
  return Math.abs(avatarAspect(url) - 1) > 0.01;
}

/**
 * Renders a ratio as the `_3x4` marker used in the stored file name. The ratio is snapped to the
 * nearest common photo/portrait ratio so the name stays readable (`3x4`, not `750x1000`) and the
 * value round-trips exactly — that ratio is what the profile renders at.
 */
const COMMON_RATIOS: [number, number][] = [
  [1, 1],
  [5, 4],
  [4, 3],
  [3, 2],
  [16, 9],
  [3, 4],
  [2, 3],
  [9, 16],
];

export function aspectMarker(ratio: number): string {
  let best = COMMON_RATIOS[0];
  let bestDiff = Infinity;
  for (const r of COMMON_RATIOS) {
    const diff = Math.abs(r[0] / r[1] - ratio);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  // Only snap when we are genuinely close; otherwise keep the exact ratio reduced.
  if (bestDiff > 0.02) {
    const scaled = Math.round(ratio * 1000);
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const d = gcd(scaled, 1000) || 1;
    return `${scaled / d}x${1000 / d}`;
  }
  return `${best[0]}x${best[1]}`;
}
