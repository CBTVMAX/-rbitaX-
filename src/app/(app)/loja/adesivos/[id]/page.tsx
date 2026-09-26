import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { StickerPackView } from "@/components/store/sticker-pack-view";
import { PACK_COLUMNS, STICKER_COLUMNS, type Pack, type Sticker } from "@/lib/stickers/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await createClient().from("StickerPack").select("name").eq("id", params.id).maybeSingle();
  return { title: data ? `${data.name} · Adesivos · Órbita X` : "Adesivos · Órbita X" };
}

export default async function StickerPackPage({ params }: { params: { id: string } }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  if (!/^[a-z0-9-]{1,32}$/.test(params.id)) notFound();

  const supabase = createClient();
  const [pack, stickers, product, library, favorite, balance, categories] = await Promise.all([
    supabase.from("StickerPack").select(PACK_COLUMNS).eq("id", params.id).eq("active", true).maybeSingle(),
    supabase.from("Sticker").select(STICKER_COLUMNS).eq("packId", params.id).eq("active", true).order("sortOrder"),
    supabase.from("StoreProduct").select("id, image").eq("kind", "sticker_pack").eq("refId", params.id).maybeSingle(),
    supabase.from("UserStickerPack").select("installed, source").eq("userId", current.authId).eq("packId", params.id).maybeSingle(),
    supabase.from("StickerPackFavorite").select("packId").eq("userId", current.authId).eq("packId", params.id).maybeSingle(),
    supabase.rpc("my_coin_balance"),
    supabase.from("StickerCategory").select("id, name, emoji"),
  ]);
  if (!pack.data) notFound();

  const p = pack.data as unknown as Omit<Pack, "coverUrl">;
  const row = library.data;
  const owned = p.tier === "free" || row?.source === "purchase" || row?.source === "grant";
  const installed = owned && (row ? row.installed : p.isDefault);

  return (
    <StickerPackView
      pack={{ ...p, coverUrl: product.data?.image || `/stickers/${p.id}/${p.cover}-s.webp` }}
      productId={product.data?.id ?? `pack-${p.id}`}
      stickers={(stickers.data ?? []) as unknown as Sticker[]}
      owned={owned}
      installed={installed}
      favorite={!!favorite.data}
      balance={typeof balance.data === "number" ? balance.data : 0}
      categories={categories.data ?? []}
    />
  );
}
