import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { mpConfigured } from "@/lib/mercadopago";
import { DiamondsView, type DiamondPackage, type DiamondMovement, type GiftItem } from "@/components/diamonds/diamonds-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diamantes · Órbita X" };

export default async function DiamantesPage(props: { searchParams: Promise<{ status?: string }> }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar?redirect=/diamantes");
  const status = (await props.searchParams).status ?? null;

  const supabase = await createClient();
  const [packages, balance, history, gifts] = await Promise.all([
    supabase.from("DiamondPackage").select("id, diamonds, priceBRL, label, badge, sortOrder").eq("active", true).order("sortOrder"),
    supabase.rpc("my_coin_balance"),
    supabase.rpc("my_diamond_history", { p_limit: 40 }),
    supabase.from("StoreProduct").select("id, name, image, priceCoins").eq("kind", "gift").eq("active", true).order("sortOrder"),
  ]);

  return (
    <DiamondsView
      packages={(packages.data ?? []) as DiamondPackage[]}
      balance={typeof balance.data === "number" ? balance.data : 0}
      history={(history.data ?? []) as DiamondMovement[]}
      gifts={(gifts.data ?? []) as GiftItem[]}
      paymentEnabled={mpConfigured()}
      returnStatus={status}
    />
  );
}
