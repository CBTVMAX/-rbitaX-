import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminStickersView, type AdminPack, type PackStats } from "@/components/admin/admin-stickers-view";
import { PACK_COLUMNS } from "@/lib/stickers/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Adesivos · Administração · Órbita X", robots: { index: false } };

export default async function AdminStickersPage() {
  const supabase = createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  // Only administrators; everyone else sees the regular 404 (the database checks again on every write).
  if (admin !== true) notFound();

  const [packs, stats, categories, products] = await Promise.all([
    supabase.from("StickerPack").select(`${PACK_COLUMNS}, active, availableFrom`).order("sortOrder"),
    supabase.rpc("admin_sticker_stats"),
    supabase.from("StickerCategory").select("id, name, emoji").order("sortOrder"),
    supabase.from("StoreProduct").select("refId, image").eq("kind", "sticker_pack"),
  ]);
  const covers = new Map((products.data ?? []).map((p) => [p.refId, p.image]));

  return (
    <AdminStickersView
      packs={((packs.data ?? []) as unknown as AdminPack[]).map((p) => ({ ...p, coverUrl: covers.get(p.id) || `/stickers/${p.id}/${p.cover}-s.webp` }))}
      stats={(stats.data ?? []) as PackStats[]}
      categories={categories.data ?? []}
    />
  );
}
