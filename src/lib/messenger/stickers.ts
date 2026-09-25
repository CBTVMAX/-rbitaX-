/**
 * Sticker packs bundled with ÓrbitaX (public/stickers/<pack>/<name>.webp + <name>-s.webp preview).
 * Artwork: Noto Animated Emoji by Google, CC BY 4.0.
 * Premium packs (Coins) will be listed here when the store opens; nothing is sold yet.
 */
export type StickerPack = { id: string; label: string; cover: string; stickers: string[] };

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "orbita",
    label: "Órbita",
    cover: "planeta",
    stickers: [
      "foguete", "planeta", "estrela", "brilhos", "alien", "disco-voador", "cometa", "lua", "tonto",
      "maravilhado", "invasor", "robo", "bola-de-cristal", "arco-iris", "sol", "raio", "globo",
    ],
  },
  {
    id: "reacoes",
    label: "Reações",
    cover: "rindo",
    stickers: [
      "rindo", "apaixonado", "festa", "chorando", "estiloso", "explodindo", "olhos", "coracao", "obrigado",
      "palmas", "comemoracao", "cem", "sono", "pensando", "susto", "pidao", "maos-coracao", "joinha", "caveira",
      "fogo", "gargalhada", "piscadinha", "abraco", "derretendo", "continencia", "oi", "forca", "gelado",
    ],
  },
];

/** "pack/name" → animated file. */
export function stickerSrc(id: string) {
  return `/stickers/${id}.webp`;
}

/** "pack/name" → light still image for the picker. */
export function stickerPreviewSrc(id: string) {
  return `/stickers/${id}-s.webp`;
}

export function isKnownSticker(id: string) {
  const [pack, name] = id.split("/");
  return STICKER_PACKS.some((p) => p.id === pack && p.stickers.includes(name));
}

function readList(key: string): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(list) ? list.filter((s) => typeof s === "string" && isKnownSticker(s)) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

const RECENT_KEY = "orbitax:stickers-recent";
const FAVORITE_KEY = "orbitax:stickers-favorite";

export const recentStickers = () => readList(RECENT_KEY).slice(0, 16);
export const favoriteStickers = () => readList(FAVORITE_KEY);

export function rememberSticker(id: string) {
  writeList(RECENT_KEY, [id, ...recentStickers().filter((s) => s !== id)].slice(0, 16));
}

export function toggleFavoriteSticker(id: string) {
  const list = favoriteStickers();
  const next = list.includes(id) ? list.filter((s) => s !== id) : [id, ...list];
  writeList(FAVORITE_KEY, next);
  return next;
}
