"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Check, Loader2, Plus, ShoppingBag, Star, X } from "lucide-react";
import {
  isAvailable,
  isOwned,
  loadLibrary,
  loadPacks,
  loadStickers,
  packCoverUrl,
  setPackInstalled,
  stickerFileUrl,
  type Library,
  type Pack,
  type Sticker,
} from "@/lib/stickers/catalog";
import { loadFavoriteStickers, toggleFavoriteSticker } from "@/lib/messenger/stickers";
import { CoinIcon, formatCoins } from "@/components/coins";
import { useMessenger } from "./context";

/** Tapping a sticker in a chat: see it big, star it, and add (or buy) the pack it came from. */
export function StickerPackSheet({ stickerId, onClose }: { stickerId: string; onClose: () => void }) {
  const { supabase, me, toast } = useMessenger();
  const router = useRouter();
  const [sticker, setSticker] = useState<Sticker | null | undefined>(undefined);
  const [pack, setPack] = useState<Pack | null>(null);
  const [lib, setLib] = useState<Library | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([loadStickers(supabase, [stickerId]), loadPacks(supabase), loadLibrary(supabase, me.id)]).then(
      ([[s], packs, library]) => {
        if (!alive) return;
        setSticker(s ?? null);
        setPack(packs.find((p) => p.id === (s?.packId ?? stickerId.split("/")[0])) ?? null);
        setLib(library);
      },
      () => alive && setSticker(null)
    );
    loadFavoriteStickers(supabase).then((f) => alive && setFavorites(f), () => {});
    return () => {
      alive = false;
    };
  }, [supabase, me.id, stickerId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const owned = pack ? isOwned(pack, lib) : false;
  const installed = pack ? !!lib?.installed.has(pack.id) : false;
  const favorite = favorites.includes(stickerId);

  async function add() {
    if (!pack) return;
    setBusy(true);
    try {
      await setPackInstalled(supabase, pack.id, true);
      setLib(await loadLibrary(supabase, me.id));
      toast(`“${pack.name}” adicionado aos seus adesivos.`);
    } catch {
      toast("Não foi possível adicionar o pack agora.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function star() {
    try {
      const next = await toggleFavoriteSticker(supabase, stickerId, favorites);
      setFavorites(next);
      toast(next.includes(stickerId) ? "Adicionado aos favoritos." : "Removido dos favoritos.");
    } catch {
      toast("Não foi possível favoritar agora.", "error");
    }
  }

  const openStore = () => {
    onClose();
    router.push(pack ? `/loja/adesivos/${pack.id}` : "/loja/adesivos");
  };

  const sheet = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-sm md:items-center" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label="Adesivo"
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-sm rounded-t-[28px] border border-white/10 bg-space-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(0,0,0,0.5)] md:rounded-3xl"
      >
        <div className="mb-1 flex justify-end">
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {sticker === undefined ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : !sticker || !pack ? (
          <p className="py-12 text-center text-sm text-white/50">Este adesivo não está mais disponível.</p>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stickerFileUrl(sticker)} alt={sticker.label} className="mx-auto h-44 w-44 object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)]" />
            <p className="mt-3 text-center text-base font-semibold text-white">{sticker.label || "Adesivo"}</p>
            <button type="button" onClick={openStore} className="mx-auto mt-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={packCoverUrl(pack, sticker.slug === pack.cover ? sticker : null)} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white/5 object-contain" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{pack.name}</span>
                <span className="block truncate text-[11px] text-white/45">
                  {pack.creator} · {pack.stickers.length} adesivos
                </span>
              </span>
              {pack.tier === "premium" ? (
                owned ? (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">Seu</span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500">
                    <CoinIcon className="h-3.5 w-3.5" /> {formatCoins(pack.priceCoins ?? 0)}
                  </span>
                )
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Grátis</span>
              )}
            </button>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={star}
                className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 py-2.5 text-xs font-semibold text-white/85 transition hover:border-amber-400/50"
              >
                <Star className={clsx("h-4 w-4", favorite && "fill-amber-400 text-amber-400")} />
                {favorite ? "Favorito" : "Favoritar"}
              </button>
              {owned && installed ? (
                <span className="flex items-center justify-center gap-1.5 rounded-full bg-white/[0.06] py-2.5 text-xs font-semibold text-white/60">
                  <Check className="h-4 w-4" /> Pack adicionado
                </span>
              ) : owned && isAvailable(pack) ? (
                <button type="button" onClick={add} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-full bg-orbit-gradient py-2.5 text-xs font-semibold text-snow disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar pack
                </button>
              ) : (
                <button type="button" onClick={openStore} className="flex items-center justify-center gap-1.5 rounded-full bg-orbit-gradient py-2.5 text-xs font-semibold text-snow">
                  <ShoppingBag className="h-4 w-4" /> {pack.tier === "premium" ? "Ver e comprar" : "Ver na loja"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(sheet, document.body);
}
