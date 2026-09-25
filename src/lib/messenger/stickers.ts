import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Sticker packs live in the database (public."StickerPack"): name, free/premium, +18, section
 * ("adesivos" → Stickers tab by category, "figurinhas" → Figurinhas tab by pack) and the list of
 * stickers; the images are in public/stickers/<pack>/<name>.webp (+ <name>-s.webp still preview).
 * Premium packs come from the Órbita X Store; the database refuses stickers the sender can't use.
 * Favorites (StickerFavorite) and recents (my own sent stickers) belong to the account.
 * Órbita, Reações, Animais and Games artwork: Noto Animated Emoji by Google, CC BY 4.0.
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
  section: "adesivos" | "figurinhas";
  category: string | null;
  animated: boolean;
  owned: boolean;
};

type Client = SupabaseClient<Database>;

let packsCache: Promise<StickerPack[]> | null = null;

export function loadStickerPacks(supabase: Client, userId: string) {
  if (!packsCache) {
    packsCache = Promise.all([
      supabase
        .from("StickerPack")
        .select("id, name, tier, priceCoins, isAdult, cover, stickers, labels, section, category, animated")
        .order("sortOrder"),
      supabase.from("UserStickerPack").select("packId").eq("userId", userId),
    ]).then(([packs, owned]) => {
      if (packs.error) throw packs.error;
      const mine = new Set((owned.data ?? []).map((o) => o.packId));
      return (packs.data ?? []).map((p) => ({
        ...(p as unknown as Omit<StickerPack, "owned">),
        owned: p.tier === "free" || mine.has(p.id),
      }));
    });
    packsCache.catch(() => (packsCache = null));
  }
  return packsCache;
}

/** After a purchase in the store, the next picker opening reloads ownership. */
export function invalidateStickerPacks() {
  packsCache = null;
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

export const STICKER_ID = /^[a-z0-9-]{1,32}\/[a-z0-9-]{1,48}$/;

// ── Favorites (synced with the account) ─────────────────────────────────────
const LEGACY_FAVORITES = "orbitax:stickers-favorite";
let favoritesCache: Promise<string[]> | null = null;

function legacyFavorites(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(LEGACY_FAVORITES) ?? "[]");
    return Array.isArray(list) ? list.filter((s) => typeof s === "string" && STICKER_ID.test(s)) : [];
  } catch {
    return [];
  }
}

export function loadFavoriteStickers(supabase: Client) {
  if (!favoritesCache) {
    favoritesCache = (async () => {
      const { data, error } = await supabase.from("StickerFavorite").select("sticker").order("createdAt", { ascending: false });
      if (error) throw error;
      let list = (data ?? []).map((r) => r.sticker);
      // Favorites chosen before the sync existed (kept on this device only) move to the account once.
      const legacy = legacyFavorites().filter((s) => !list.includes(s));
      for (const s of legacy.slice(0, 50)) {
        const { data: on } = await supabase.rpc("toggle_sticker_favorite", { p_sticker: s });
        if (on) list = [s, ...list];
      }
      try {
        localStorage.removeItem(LEGACY_FAVORITES);
      } catch {
        /* private mode */
      }
      return list;
    })();
    favoritesCache.catch(() => (favoritesCache = null));
  }
  return favoritesCache;
}

export async function toggleFavoriteSticker(supabase: Client, id: string, current: string[]) {
  const { data, error } = await supabase.rpc("toggle_sticker_favorite", { p_sticker: id });
  if (error) throw error;
  const next = data ? [id, ...current.filter((s) => s !== id)] : current.filter((s) => s !== id);
  favoritesCache = Promise.resolve(next);
  return next;
}

// ── Recents (the stickers I sent, on any device) ─────────────────────────────
let recentsCache: Promise<string[]> | null = null;
let sessionRecents: string[] = [];

export function loadRecentStickers(supabase: Client) {
  if (!recentsCache) {
    recentsCache = Promise.resolve(supabase.rpc("my_recent_stickers", { p_limit: 30 })).then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []).map((r) => r.sticker).filter((s): s is string => !!s && STICKER_ID.test(s));
    });
    recentsCache.catch(() => (recentsCache = null));
  }
  return recentsCache.then((list) => [...sessionRecents, ...list.filter((s) => !sessionRecents.includes(s))].slice(0, 30));
}

/** Called when a sticker is sent: shows up first in "Recentes" right away. */
export function rememberSticker(id: string) {
  sessionRecents = [id, ...sessionRecents.filter((s) => s !== id)].slice(0, 30);
}

// ── Popular (most sent on ÓrbitaX in the last 30 days) ───────────────────────
let popularCache: { at: number; list: Promise<string[]> } | null = null;

export function loadPopularStickers(supabase: Client) {
  if (!popularCache || Date.now() - popularCache.at > 5 * 60_000) {
    const list = Promise.resolve(supabase.rpc("popular_stickers", { p_limit: 30 })).then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []).map((r) => r.sticker).filter((s): s is string => !!s && STICKER_ID.test(s));
    });
    list.catch(() => (popularCache = null));
    popularCache = { at: Date.now(), list };
  }
  return popularCache.list;
}
