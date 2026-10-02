"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, X } from "lucide-react";
import { StickerStoreView } from "@/components/store/sticker-store-view";
import { StickerPackView } from "@/components/store/sticker-pack-view";
import { loadPackDetail, loadStoreData, type PackDetail, type StoreData } from "@/lib/stickers/store-data";
import { useMessenger } from "./context";

/**
 * A Loja de Adesivos aberta por cima da conversa (no computador, uma janela grande; no celular,
 * tela cheia). Comprar ou adicionar um pack aqui já deixa ele no painel de adesivos ao fechar.
 */
export function ChatStickerStore({ initialPack, onClose }: { initialPack: string | null; onClose: () => void }) {
  const { supabase, me } = useMessenger();
  const [data, setData] = useState<StoreData | null>(null);
  const [failed, setFailed] = useState(false);
  const [packId, setPackId] = useState<string | null>(initialPack);
  const [detail, setDetail] = useState<PackDetail | null | "loading">(initialPack ? "loading" : null);
  const scroller = useRef<HTMLDivElement>(null);
  const homeScroll = useRef(0);

  useEffect(() => {
    loadStoreData(supabase, me.id).then(setData, () => setFailed(true));
  }, [supabase, me.id]);

  useEffect(() => {
    if (!packId) return setDetail(null);
    let alive = true;
    setDetail("loading");
    loadPackDetail(supabase, me.id, packId).then(
      (d) => alive && setDetail(d),
      () => alive && setDetail(null)
    );
    return () => {
      alive = false;
    };
  }, [packId, supabase, me.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[data-store-dialog]")) return;
      if (packId) back();
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  });

  function open(id: string) {
    homeScroll.current = scroller.current?.scrollTop ?? 0;
    setPackId(id);
    scroller.current?.scrollTo({ top: 0 });
  }

  function back() {
    setPackId(null);
    // Recarrega a loja (o pack pode ter sido comprado/adicionado) e volta para onde estava.
    loadStoreData(supabase, me.id).then(setData, () => {});
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: homeScroll.current }));
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-stretch justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label="Loja de adesivos"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in relative flex h-full w-full flex-col overflow-hidden bg-space-bg md:h-[min(88vh,920px)] md:max-w-5xl md:rounded-3xl md:border md:border-white/10 md:shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div ref={scroller} className="orbit-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {failed ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-300" />
              <p className="text-sm text-white/70">Não foi possível abrir a loja agora.</p>
              <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/5">
                Fechar
              </button>
            </div>
          ) : packId ? (
            detail === "loading" ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : detail ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar loja"
                  className="absolute right-4 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:text-white md:right-6 md:top-6"
                >
                  <X className="h-4 w-4" />
                </button>
                <StickerPackView key={detail.pack.id} {...detail} onBack={back} />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-white/70">Esse pacote não está mais disponível.</p>
                <button type="button" onClick={back} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/5">
                  Voltar para a loja
                </button>
              </div>
            )
          ) : data ? (
            <StickerStoreView {...data} initialCategory={null} initialQuery="" embedded onOpenPack={open} onClose={onClose} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
