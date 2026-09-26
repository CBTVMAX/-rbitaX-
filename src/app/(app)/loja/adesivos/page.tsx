import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { StickerStoreView } from "@/components/store/sticker-store-view";
import { PACK_COLUMNS, type Pack } from "@/lib/stickers/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Adesivos · Órbita X Store" };

export default async function AdesivosPage({ searchParams }: { searchParams: { categoria?: string; q?: string } }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  const [packs, products, categories, library, favorites, balance, admin] = await Promise.all([
    supabase.from("StickerPack").select(PACK_COLUMNS).eq("active", true).eq("published", true).order("sortOrder"),
    supabase.from("StoreProduct").select("refId, image").eq("kind", "sticker_pack"),
    supabase.from("StickerCategory").select("id, name, emoji, isAdult").eq("active", true).order("sortOrder"),
    supabase.from("UserStickerPack").select("packId, installed, source").eq("userId", current.authId),
    supabase.from("StickerPackFavorite").select("packId").eq("userId", current.authId),
    supabase.rpc("my_coin_balance"),
    supabase.rpc("is_admin"),
  ]);

  const covers = new Map((products.data ?? []).map((p) => [p.refId, p.image]));
  const list = ((packs.data ?? []) as unknown as Omit<Pack, "coverUrl">[]).map((p) => ({
    ...p,
    coverUrl: covers.get(p.id) || `/stickers/${p.id}/${p.cover}-s.webp`,
  }));

  return (
    <StickerStoreView
      packs={list}
      categories={categories.data ?? []}
      library={library.data ?? []}
      favoritePacks={(favorites.data ?? []).map((f) => f.packId)}
      balance={typeof balance.data === "number" ? balance.data : 0}
      isAdmin={admin.data === true}
      initialCategory={searchParams.categoria ?? null}
      initialQuery={searchParams.q ?? ""}
    />
  );
}
