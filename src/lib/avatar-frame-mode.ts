/**
 * How a frame is applied to the profile photo. The choice belongs to the user and must never force
 * a crop or a stretch, so the photo is always rendered at its own ratio inside the chrome.
 */
export type FrameMode = "fit" | "follow" | "none";

/** Default for existing users and for anything saved before the mode existed. */
export const DEFAULT_FRAME_MODE: FrameMode = "fit";

const FRAME_MODES: FrameMode[] = ["fit", "follow", "none"];

export const FRAME_MODE_LABELS: Record<FrameMode, { title: string; hint: string }> = {
  fit: {
    title: "Foto encaixada",
    hint: "A moldura fica do tamanho de sempre e a foto se ajusta dentro dela.",
  },
  follow: {
    title: "Moldura no formato",
    hint: "A moldura acompanha o formato da foto, sempre sem cortar a imagem.",
  },
  none: {
    title: "Sem moldura",
    hint: "Mostra só a foto, sem moldura ao redor.",
  },
};

export function isFrameMode(v: unknown): v is FrameMode {
  return typeof v === "string" && FRAME_MODES.includes(v as FrameMode);
}

/**
 * Frame mode and ratio travel in the stored file name, so every consumer of `User.avatarUrl` can
 * read them without a database column: `<uuid>_3x4_follow.webp`. Avatars saved before this feature
 * simply have no marker and fall back to the defaults.
 */
const MARKER = /_(\d+x\d+)(?:_(fit|follow|none))?\.(?:webp|jpg|jpeg|png|avif)$/i;

export function avatarFrameMode(url: string | null | undefined): FrameMode {
  if (!url) return DEFAULT_FRAME_MODE;
  const m = url.match(MARKER);
  const mode = m?.[2]?.toLowerCase();
  return isFrameMode(mode) ? mode : DEFAULT_FRAME_MODE;
}

export function frameModeSuffix(mode: FrameMode): string {
  return mode === DEFAULT_FRAME_MODE ? "" : `_${mode}`;
}
