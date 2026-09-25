import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { StoreView } from "@/components/store/store-view";
import { PRODUCT_COLUMNS, STORE_CATEGORIES, type InventoryItem, type StoreCategory, type StoreProduct } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Órbita X Store" };

export default async function LojaPage({ searchParams }: { searchParams: { categoria?: string; produto?: string } }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  const [products, inventory, balance, packs] = await Promise.all([
    supabase.from("StoreProduct").select(PRODUCT_COLUMNS).order("sortOrder"),
    supabase.from("UserInventory").select("productId, source, isFavorite, acquiredAt"),
    supabase.rpc("my_coin_balance"),
    supabase.from("StickerPack").select("id, stickers, animated"),
  ]);

  const list = (products.data ?? []) as unknown as StoreProduct[];
  const category = STORE_CATEGORIES.some((c) => c.id === searchParams.categoria) ? (searchParams.categoria as StoreCategory) : "adesivos";
  const product = searchParams.produto && list.some((p) => p.id === searchParams.produto) ? searchParams.produto : null;
  const { profile } = current;

  return (
    <StoreView
      products={list}
      inventory={(inventory.data ?? []) as InventoryItem[]}
      balance={typeof balance.data === "number" ? balance.data : 0}
      viewer={{ name: profile.name, avatarUrl: profile.avatarUrl, avatarFrame: profile.avatarFrame ?? null }}
      viewerId={current.authId}
      packs={(packs.data ?? []) as { id: string; stickers: string[]; animated: boolean }[]}
      initialCategory={category}
      initialProduct={product}
    />
  );
}
