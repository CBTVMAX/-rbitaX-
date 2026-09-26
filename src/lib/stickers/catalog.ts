import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Sticker catalog shared by the chat picker, the Sticker Store and the admin panel.
 *
 * Packs (StickerPack) and stickers (Sticker) live in the database. Where a file lives depends on
 * Sticker.storage:
 *   app          public/stickers/<file>            (bundled, free)
 *   app-premium  private-stickers/<file>           (bundled, served by /api/sticker-file after an ownership check)
 *   public       bucket sticker-assets             (uploaded by an admin, free)
 *   premium      bucket sticker-premium (private)  (uploaded by an admin, signed link after an ownership check)
 * Previews (small stills) are always public so a pack can be browsed before it is bought.
 */

type Client = SupabaseClient<Database>;

export type StickerStorage = "app" | "app-premium" | "public" | "premium";
export type Rating = "livre" | "sensivel" | "adulto";

export type Sticker = {
  id: string;
  packId: string;
  slug: string;
  label: string;
  keywords: string[];
  storage: StickerStorage;
  file: string;
  preview: string | null;
  format: "static" | "animated";
  width: number;
  height: number;
  size: "mini" | "normal" | "large";
  hasText: boolean;
  rating: Rating;
  sortOrder: number;
};

export type Pack = {
  id: string;
  name: string;
  tier: "free" | "premium";
  priceCoins: number | null;
  isAdult: boolean;
  cover: string;
  stickers: string[];
  section: string;
  category: string | null;
  categories: string[];
  animated: boolean;
  creator: string;
  description: string;
  rating: Rating;
  published: boolean;
  featured: boolean;
  isDefault: boolean;
  exclusive: boolean;
  availableUntil: string | null;
  sortOrder: number;
  createdAt: string;
  /** Resolved cover image (from the store mirror, which knows where the cover sticker lives). */
  coverUrl: string;
};

export type Library = {
  /** Packs this account can send from (free, bought or granted). */
  owned: Set<string>;
  /** Packs shown in the chat picker. */
  installed: Set<string>;
  /** Packs the person starred in the store. */
  favoritePacks: Set<string>;
};

export const PACK_COLUMNS =
  "id, name, tier, priceCoins, isAdult, cover, stickers, section, category, categories, animated, creator, description, rating, published, featured, isDefault, exclusive, availableUntil, sortOrder, createdAt";
export const STICKER_COLUMNS =
  "id, packId, slug, label, keywords, storage, file, preview, format, width, height, size, hasText, rating, sortOrder";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function stickerFileUrl(s: Pick<Sticker, "storage" | "file">) {
  switch (s.storage) {
    case "app":
      return `/stickers/${s.file}`;
    case "public":
      return `${SUPABASE_URL}/storage/v1/object/public/sticker-assets/${s.file}`;
    default:
      return `/api/sticker-file/${s.file}`;
  }
}

export function stickerPreviewUrl(s: Pick<Sticker, "storage" | "file" | "preview">) {
  const p = s.preview ?? s.file;
  if (s.storage === "app" || s.storage === "app-premium") return `/stickers/${p}`;
  return `${SUPABASE_URL}/storage/v1/object/public/sticker-assets/${p}`;
}

/** Cover of a pack: the preview of its cover sticker. */
export function packCoverUrl(pack: Pick<Pack, "id" | "cover"> & { coverUrl?: string }, cover?: Sticker | null) {
  return cover ? stickerPreviewUrl(cover) : pack.coverUrl || `/stickers/${pack.id}/${pack.cover}-s.webp`;
}

export function isOwned(pack: Pick<Pack, "id" | "tier">, lib: Library | null) {
  return pack.tier === "free" || !!lib?.owned.has(pack.id);
}

export function isAvailable(pack: Pick<Pack, "availableUntil">) {
  return !pack.availableUntil || new Date(pack.availableUntil).getTime() > Date.now();
}

// ── Packs ───────────────────────────────────────────────────────────────────
let packsCache: Promise<Pack[]> | null = null;

export function loadPacks(supabase: Client) {
  if (!packsCache) {
    packsCache = Promise.all([
      supabase.from("StickerPack").select(PACK_COLUMNS).eq("active", true).order("sortOrder"),
      supabase.from("StoreProduct").select("refId, image").eq("kind", "sticker_pack"),
    ]).then(([packs, products]) => {
      if (packs.error) throw packs.error;
      const covers = new Map((products.data ?? []).map((p) => [p.refId, p.image]));
      return ((packs.data ?? []) as unknown as Omit<Pack, "coverUrl">[]).map((p) => ({
        ...p,
        coverUrl: covers.get(p.id) || `/stickers/${p.id}/${p.cover}-s.webp`,
      }));
    });
    packsCache.catch(() => (packsCache = null));
  }
  return packsCache;
}

// ── The person's library ─────────────────────────────────────────────────────
let libraryCache: Promise<Library> | null = null;

export function loadLibrary(supabase: Client, userId: string) {
  if (!libraryCache) {
    libraryCache = Promise.all([
      loadPacks(supabase),
      supabase.from("UserStickerPack").select("packId, installed, source").eq("userId", userId),
      supabase.from("StickerPackFavorite").select("packId").eq("userId", userId),
    ]).then(([packs, rows, favs]) => {
      if (rows.error) throw rows.error;
      const byPack = new Map((rows.data ?? []).map((r) => [r.packId, r]));
      const owned = new Set<string>();
      const installed = new Set<string>();
      for (const p of packs) {
        const row = byPack.get(p.id);
        if (p.tier === "free" || (row && (row.source === "purchase" || row.source === "grant"))) owned.add(p.id);
        // A pack shows in the picker when the person added it, or it ships by default and they never removed it.
        const on = row ? row.installed : p.isDefault;
        if (on && owned.has(p.id)) installed.add(p.id);
      }
      return { owned, installed, favoritePacks: new Set((favs.data ?? []).map((f) => f.packId)) };
    });
    libraryCache.catch(() => (libraryCache = null));
  }
  return libraryCache;
}

/** After a purchase, install, uninstall or admin change. */
export function invalidateCatalog() {
  packsCache = null;
  libraryCache = null;
  stickerCache.clear();
  packStickerCache.clear();
}

export async function setPackInstalled(supabase: Client, packId: string, installed: boolean) {
  const { error } = await supabase.rpc("set_sticker_pack_installed", { p_pack: packId, p_installed: installed });
  if (error) throw error;
  libraryCache = null;
}

export async function togglePackFavorite(supabase: Client, packId: string) {
  const { data, error } = await supabase.rpc("toggle_sticker_pack_favorite", { p_pack: packId });
  if (error) throw error;
  libraryCache = null;
  return !!data;
}

// ── Stickers (loaded per pack, on demand) ───────────────────────────────────
const stickerCache = new Map<string, Sticker>();
const packStickerCache = new Map<string, Promise<Sticker[]>>();

export function loadPackStickers(supabase: Client, packId: string) {
  let p = packStickerCache.get(packId);
  if (!p) {
    p = Promise.resolve(
      supabase.from("Sticker").select(STICKER_COLUMNS).eq("packId", packId).eq("active", true).order("sortOrder")
    ).then(({ data, error }) => {
      if (error) throw error;
      const list = (data ?? []) as unknown as Sticker[];
      list.forEach((s) => stickerCache.set(s.id, s));
      return list;
    });
    p.catch(() => packStickerCache.delete(packId));
    packStickerCache.set(packId, p);
  }
  return p;
}

/** Sticker rows for a list of ids (recents, favorites, search), in the same order, unknown ones dropped. */
export async function loadStickers(supabase: Client, ids: string[]) {
  const missing = ids.filter((id) => !stickerCache.has(id));
  for (let i = 0; i < missing.length; i += 100) {
    const { data } = await supabase.from("Sticker").select(STICKER_COLUMNS).in("id", missing.slice(i, i + 100));
    ((data ?? []) as unknown as Sticker[]).forEach((s) => stickerCache.set(s.id, s));
  }
  return ids.map((id) => stickerCache.get(id)).filter((s): s is Sticker => !!s);
}

export function cachedSticker(id: string) {
  return stickerCache.get(id);
}

export async function searchStickers(supabase: Client, query: string) {
  const { data, error } = await supabase.rpc("search_stickers", { p_query: query, p_limit: 90 });
  if (error) throw error;
  const res = (data ?? { packs: [], stickers: [] }) as { packs: string[]; stickers: string[] };
  return { packIds: res.packs ?? [], stickers: await loadStickers(supabase, res.stickers ?? []) };
}

/** Display box (CSS px) for a sticker in a chat bubble, by its size class and shape. */
export function stickerBox(s: { size?: string | null; w?: number | null; h?: number | null }) {
  const base = s.size === "mini" ? 104 : s.size === "large" ? 184 : 148;
  const w = s.w || 1;
  const h = s.h || 1;
  const r = w / h;
  return r >= 1 ? { width: base, height: Math.round(base / Math.min(r, 1.8)) } : { width: Math.round(base * Math.max(r, 0.6)), height: base };
}

export const RATING_LABEL: Record<Rating, string> = { livre: "Livre", sensivel: "Sensível", adulto: "+18" };
