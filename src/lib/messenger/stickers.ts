import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Sticker packs live in the database (public."StickerPack"): name, free/premium, +18 and the list
 * of stickers; the images are in public/stickers/<pack>/<name>.webp (+ <name>-s.webp preview).
 * Premium packs are sold with Coins when the store opens; until then nobody can send them
 * (the database refuses premium stickers the sender doesn't own).
 * Órbita and Reações artwork: Noto Animated Emoji by Google, CC BY 4.0.
 */
export type StickerPack = {
  id: string;
  name: string;
  tier: "free" | "premium";
  priceCoins: number | null;
  isAdult: boolean;
  cover: string;
  stickers: string[];
  labels: string[] | null;
  owned: boolean;
};

let cache: Promise<StickerPack[]> | null = null;

export function loadStickerPacks(supabase: SupabaseClient<Database>, userId: string) {
  if (!cache) {
    cache = Promise.all([
      supabase.from("StickerPack").select("id, name, tier, priceCoins, isAdult, cover, stickers, labels").order("sortOrder"),
      supabase.from("UserStickerPack").select("packId").eq("userId", userId),
    ]).then(([packs, owned]) => {
      const mine = new Set((owned.data ?? []).map((o) => o.packId));
      return (packs.data ?? []).map((p) => ({
        ...(p as Omit<StickerPack, "owned">),
        owned: p.tier === "free" || mine.has(p.id),
      }));
    });
    cache.catch(() => (cache = null));
  }
  return cache;
}

export function canSend(pack: StickerPack | undefined) {
  return !!pack && (pack.tier === "free" || pack.owned);
}

export function stickerLabel(pack: StickerPack | undefined, name: string) {
  const i = pack?.stickers.indexOf(name) ?? -1;
  return (i >= 0 && pack?.labels?.[i]) || name.replace(/-/g, " ");
}

/** "pack/name" → animated / full image. */
export function stickerSrc(id: string) {
  return `/stickers/${id}.webp`;
}

/** "pack/name" → light still image for the picker. */
export function stickerPreviewSrc(id: string) {
  return `/stickers/${id}-s.webp`;
}

const STICKER_ID = /^[a-z0-9-]{1,32}\/[a-z0-9-]{1,48}$/;

function readList(key: string): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(list) ? list.filter((s) => typeof s === "string" && STICKER_ID.test(s)) : [];
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

export const recentStickers = () => readList(RECENT_KEY).slice(0, 24);
export const favoriteStickers = () => readList(FAVORITE_KEY);

export function rememberSticker(id: string) {
  writeList(RECENT_KEY, [id, ...recentStickers().filter((s) => s !== id)].slice(0, 24));
}

export function toggleFavoriteSticker(id: string) {
  const list = favoriteStickers();
  const next = list.includes(id) ? list.filter((s) => s !== id) : [id, ...list];
  writeList(FAVORITE_KEY, next);
  return next;
}
