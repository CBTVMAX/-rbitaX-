"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Gift, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GiftDialog, type GiftProduct, type GiftRecipient } from "@/components/gift-dialog";

/** Botão "Presentear" no perfil de outra pessoa: envia um presente em Diamantes. */
export function ProfileGiftButton({ recipient, compact }: { recipient: GiftRecipient; compact?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gifts, setGifts] = useState<GiftProduct[]>([]);
  const [balance, setBalance] = useState(0);

  async function openDialog() {
    setLoading(true);
    const [g, b] = await Promise.all([
      supabase.from("StoreProduct").select("id, name, image, priceCoins").eq("kind", "gift").eq("active", true).order("sortOrder"),
      supabase.rpc("my_coin_balance"),
    ]);
    setGifts((g.data ?? []) as GiftProduct[]);
    setBalance(typeof b.data === "number" ? b.data : 0);
    setLoading(false);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Presentear"
        className={clsx(
          "flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-space-bg/40 text-sm font-medium text-white transition hover:bg-white/5",
          compact ? "h-11 w-11 shrink-0" : "px-4 py-2.5"
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4 text-orbit-cyan" />}
        {!compact && "Presentear"}
      </button>
      {open && (
        <GiftDialog gifts={gifts} balance={balance} recipient={recipient} onClose={() => setOpen(false)} onSent={(nb) => setBalance(nb)} />
      )}
    </>
  );
}
