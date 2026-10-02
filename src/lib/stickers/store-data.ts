import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { PACK_COLUMNS, STICKER_COLUMNS, type Pack, type Sticker } from "./catalog";

/**
 * Mesmos dados que as páginas /loja/adesivos e /loja/adesivos/[id] montam no servidor, carregados no
 * navegador para a loja abrir dentro do chat sem sair da conversa.
 */
type Client = SupabaseClient<Database>;

export type StoreCategory = { id: string; name: string; emoji: string; isAdult: boolean };
export type StoreLibraryRow = { packId: string; installed: boolean; source: string };

export type StoreData = {
  packs: Pack[];
  categories: StoreCategory[];
  library: StoreLibraryRow[];
  favoritePacks: string[];
  balance: number;
  isAdmin: boolean;
};

export async function loadStoreData(supabase: Client, userId: string): Promise<StoreData> {
  const [packs, products, categories, library, favorites, balance, admin] = await Promise.all([
    supabase.from("StickerPack").select(PACK_COLUMNS).eq("active", true).eq("published", true).order("sortOrder"),
    supabase.from("StoreProduct").select("refId, image").eq("kind", "sticker_pack"),
    supabase.from("StickerCategory").select("id, name, emoji, isAdult").eq("active", true).order("sortOrder"),
    supabase.from("UserStickerPack").select("packId, installed, source").eq("userId", userId),
    supabase.from("StickerPackFavorite").select("packId").eq("userId", userId),
    supabase.rpc("my_coin_balance"),
    supabase.rpc("is_admin"),
  ]);
  if (packs.error) throw packs.error;
  const covers = new Map((products.data ?? []).map((p) => [p.refId, p.image]));
  return {
    packs: ((packs.data ?? []) as unknown as Omit<Pack, "coverUrl">[]).map((p) => ({
      ...p,
      coverUrl: covers.get(p.id) || `/stickers/${p.id}/${p.cover}-s.webp`,
    })),
    categories: (categories.data ?? []) as StoreCategory[],
    library: (library.data ?? []) as StoreLibraryRow[],
    favoritePacks: (favorites.data ?? []).map((f) => f.packId),
    balance: typeof balance.data === "number" ? balance.data : 0,
    isAdmin: admin.data === true,
  };
}

export type PackDetail = {
  pack: Pack;
  productId: string;
  stickers: Sticker[];
  owned: boolean;
  installed: boolean;
  favorite: boolean;
  balance: number;
  categories: { id: string; name: string; emoji: string }[];
};

export async function loadPackDetail(supabase: Client, userId: string, packId: string): Promise<PackDetail | null> {
  if (!/^[a-z0-9-]{1,32}$/.test(packId)) return null;
  const [pack, stickers, product, library, favorite, balance, categories] = await Promise.all([
    supabase.from("StickerPack").select(PACK_COLUMNS).eq("id", packId).eq("active", true).maybeSingle(),
    supabase.from("Sticker").select(STICKER_COLUMNS).eq("packId", packId).eq("active", true).order("sortOrder"),
    supabase.from("StoreProduct").select("id, image").eq("kind", "sticker_pack").eq("refId", packId).maybeSingle(),
    supabase.from("UserStickerPack").select("installed, source").eq("userId", userId).eq("packId", packId).maybeSingle(),
    supabase.from("StickerPackFavorite").select("packId").eq("userId", userId).eq("packId", packId).maybeSingle(),
    supabase.rpc("my_coin_balance"),
    supabase.from("StickerCategory").select("id, name, emoji"),
  ]);
  if (!pack.data) return null;
  const p = pack.data as unknown as Omit<Pack, "coverUrl">;
  const row = library.data;
  const owned = p.tier === "free" || row?.source === "purchase" || row?.source === "grant";
  return {
    pack: { ...p, coverUrl: product.data?.image || `/stickers/${p.id}/${p.cover}-s.webp` },
    productId: product.data?.id ?? `pack-${p.id}`,
    stickers: (stickers.data ?? []) as unknown as Sticker[],
    owned,
    installed: owned && (row ? row.installed : p.isDefault),
    favorite: !!favorite.data,
    balance: typeof balance.data === "number" ? balance.data : 0,
    categories: categories.data ?? [],
  };
}
