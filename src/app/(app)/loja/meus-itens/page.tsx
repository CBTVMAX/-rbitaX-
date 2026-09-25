import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { MyItemsView, type OwnedItem, type ReceivedGift, type Transaction } from "@/components/store/my-items-view";
import { PRODUCT_COLUMNS } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meus itens · Órbita X Store" };

export default async function MeusItensPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  const [inventory, gifts, transactions, balance] = await Promise.all([
    supabase
      .from("UserInventory")
      .select(`productId, source, isFavorite, acquiredAt, product:StoreProduct(${PRODUCT_COLUMNS})`)
      .order("acquiredAt", { ascending: false }),
    supabase
      .from("VirtualGift")
      .select("id, conversationId, note, createdAt, product:StoreProduct(name, image), sender:User!VirtualGift_senderId_fkey(name, username, avatarUrl)")
      .eq("recipientId", current.authId)
      .order("createdAt", { ascending: false })
      .limit(60),
    supabase.from("CoinTransaction").select("id, amount, balanceAfter, kind, description, createdAt").order("createdAt", { ascending: false }).limit(50),
    supabase.rpc("my_coin_balance"),
  ]);

  const items = ((inventory.data ?? []) as unknown as OwnedItem[]).filter((i) => i.product);
  const { profile } = current;

  return (
    <MyItemsView
      items={items}
      gifts={(gifts.data ?? []) as unknown as ReceivedGift[]}
      transactions={(transactions.data ?? []) as Transaction[]}
      balance={typeof balance.data === "number" ? balance.data : 0}
      viewer={{ name: profile.name, avatarUrl: profile.avatarUrl, avatarFrame: profile.avatarFrame ?? null }}
      viewerId={current.authId}
    />
  );
}
