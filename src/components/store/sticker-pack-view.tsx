"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, Check, Flag, Heart, Loader2, Lock, Minus, Plus, Share2, ShoppingBag, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CoinIcon, formatCoins } from "@/components/coins";
import { invalidateStickerPacks } from "@/lib/messenger/stickers";
import { announceBalance, storeErrorMessage } from "@/lib/store";
import { invalidateCatalog, RATING_LABEL, stickerFileUrl, stickerPreviewUrl, type Pack, type Sticker } from "@/lib/stickers/catalog";
import { useCoinBalance } from "./coin-balance";
import { useStoreToast } from "./store-view";

const ADULT_OK = "orbitax:adult-ok";
const REPORT_REASONS = ["Conteúdo explícito", "Discurso de ódio", "Violência", "Direitos autorais", "Outro motivo"];

export function StickerPackView({
  pack,
  productId,
  stickers,
  owned: initialOwned,
  installed: initialInstalled,
  favorite: initialFavorite,
  balance: initialBalance,
  categories,
}: {
  pack: Pack;
  productId: string;
  stickers: Sticker[];
  owned: boolean;
  installed: boolean;
  favorite: boolean;
  balance: number;
  categories: { id: string; name: string; emoji: string }[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const live = useCoinBalance(initialBalance);
  const balance = live ?? initialBalance;
  const { toast, node } = useStoreToast();
  const [owned, setOwned] = useState(initialOwned);
  const [installed, setInstalled] = useState(initialInstalled);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState<null | "buy" | "install" | "fav" | "report">(null);
  const [confirm, setConfirm] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [big, setBig] = useState<Sticker | null>(null);
  const [adultOk, setAdultOk] = useState(() => {
    if (pack.rating !== "adulto") return true;
    try {
      return sessionStorage.getItem(ADULT_OK) === "1";
    } catch {
      return false;
    }
  });

  const price = pack.priceCoins ?? 0;
  const premium = pack.tier === "premium";
  const available = !pack.availableUntil || new Date(pack.availableUntil).getTime() > Date.now();
  const cats = categories.filter((c) => pack.categories.includes(c.id));

  function refreshCaches() {
    invalidateCatalog();
    invalidateStickerPacks();
  }

  async function acquire() {
    setBusy("buy");
    const { data, error } = await supabase.rpc("acquire_product", { p_product_id: productId });
    setBusy(null);
    setConfirm(false);
    if (error) return toast(storeErrorMessage(error.message), true);
    const res = data as { balance?: number } | null;
    if (typeof res?.balance === "number") announceBalance(res.balance);
    setOwned(true);
    setInstalled(true);
    refreshCaches();
    toast(premium ? `Compra concluída: ${pack.name}. Já está no seu chat.` : `${pack.name} adicionado aos seus adesivos.`);
    router.refresh();
  }

  async function toggleInstalled() {
    setBusy("install");
    const next = !installed;
    const { error } = await supabase.rpc("set_sticker_pack_installed", { p_pack: pack.id, p_installed: next });
    setBusy(null);
    if (error) return toast("Não foi possível atualizar agora.", true);
    setInstalled(next);
    refreshCaches();
    toast(next ? "Pack adicionado ao seu chat." : "Pack removido do seu chat. Você pode adicionar de novo quando quiser.");
  }

  async function toggleFavorite() {
    setBusy("fav");
    const { data, error } = await supabase.rpc("toggle_sticker_pack_favorite", { p_pack: pack.id });
    setBusy(null);
    if (error) return toast("Não foi possível favoritar agora.", true);
    setFavorite(!!data);
    refreshCaches();
    toast(data ? "Pack nos seus favoritos." : "Pack removido dos favoritos.");
  }

  async function share() {
    const url = `${window.location.origin}/loja/adesivos/${pack.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${pack.name} · Adesivos Órbita X`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link do pack copiado.");
      }
    } catch {
      /* share sheet closed */
    }
  }

  async function report(reason: string) {
    setBusy("report");
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("Report").insert({
      id: crypto.randomUUID(),
      reporterId: me.user?.id ?? "",
      targetType: "sticker_pack",
      targetId: pack.id,
      reason,
    });
    setBusy(null);
    setReporting(false);
    toast(error ? "Não foi possível enviar a denúncia agora." : "Denúncia enviada. Nossa equipe vai analisar.", !!error);
  }

  const action = !owned ? (
    <button
      type="button"
      onClick={() => (premium ? setConfirm(true) : acquire())}
      disabled={busy !== null || !available}
      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-orbit-gradient px-5 py-3 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-60"
    >
      {busy === "buy" ? <Loader2 className="h-4 w-4 animate-spin" /> : premium ? <ShoppingBag className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {!available ? "Indisponível" : premium ? (
        <>
          Comprar · <CoinIcon className="h-4 w-4" /> {formatCoins(price)}
        </>
      ) : (
        "Adicionar"
      )}
    </button>
  ) : (
    <button
      type="button"
      onClick={toggleInstalled}
      disabled={busy !== null}
      className={clsx(
        "flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-60",
        installed ? "border border-white/15 text-white/85 hover:bg-white/5" : "bg-orbit-gradient text-snow shadow-glow hover:opacity-90"
      )}
    >
      {busy === "install" ? <Loader2 className="h-4 w-4 animate-spin" /> : installed ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {installed ? "Remover do chat" : "Adicionar ao chat"}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-3 md:px-6 md:pb-12 md:pt-6">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/loja/adesivos"))}
        className="flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Adesivos
      </button>

      <div className="mt-3 md:grid md:grid-cols-[300px_1fr] md:gap-8">
        {/* Pack card */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-space-surface/70 p-5 md:sticky md:top-24 md:self-start">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-orbit-purple/25 blur-3xl" />
          <div className="relative flex items-center gap-4 md:flex-col md:items-start">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_40%,rgb(var(--app-accent,139_92_246)/0.25),transparent_70%)] md:h-40 md:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pack.coverUrl} alt="" className={clsx("h-[85%] w-[85%] object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)] md:h-32 md:w-32", !adultOk && "blur-md")} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-white md:text-2xl">{pack.name}</h1>
              <p className="mt-0.5 text-sm text-white/55">por {pack.creator}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", premium ? "bg-amber-400/15 text-amber-500" : "bg-emerald-500/15 text-emerald-400")}>
                  {premium ? "Premium" : "Grátis"}
                </span>
                {pack.exclusive && <span className="rounded-full bg-orbit-gradient px-2 py-0.5 text-[10px] font-bold uppercase text-snow">Exclusivo</span>}
                {pack.animated && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/80">Animado</span>}
                {pack.rating !== "livre" && (
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", pack.rating === "adulto" ? "bg-orbit-pink/90 text-snow" : "bg-white/10 text-white/80")}>
                    {RATING_LABEL[pack.rating]}
                  </span>
                )}
              </div>
            </div>
          </div>
          {pack.description && <p className="relative mt-4 text-sm leading-relaxed text-white/70">{pack.description}</p>}
          <p className="relative mt-3 text-xs text-white/45">
            {stickers.length} adesivos{pack.availableUntil && ` · disponível até ${new Date(pack.availableUntil).toLocaleDateString("pt-BR")}`}
          </p>
          {cats.length > 0 && (
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <Link key={c.id} href={`/loja/adesivos?categoria=${c.id}`} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/65 transition hover:text-white">
                  {c.emoji} {c.name}
                </Link>
              ))}
            </div>
          )}

          <div className="relative mt-5 hidden gap-2 md:flex">{action}</div>
          <div className="relative mt-3 flex gap-2">
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={busy !== null}
              aria-pressed={favorite}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 py-2.5 text-xs font-semibold text-white/80 transition hover:border-orbit-pink/50 disabled:opacity-60"
            >
              <Heart className={clsx("h-4 w-4", favorite && "fill-orbit-pink text-orbit-pink")} /> {favorite ? "Favorito" : "Favoritar"}
            </button>
            <button type="button" onClick={share} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 py-2.5 text-xs font-semibold text-white/80 transition hover:border-white/25">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
            <button
              type="button"
              onClick={() => setReporting(true)}
              aria-label="Denunciar pack"
              className="flex w-11 items-center justify-center rounded-full border border-white/10 text-white/55 transition hover:border-red-400/50 hover:text-red-300"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preview grid */}
        <div className="mt-5 md:mt-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">Prévia</h2>
            {premium && !owned && (
              <span className="flex items-center gap-1 text-[11px] text-white/45">
                <Lock className="h-3 w-3" /> Prévia em baixa resolução até a compra
              </span>
            )}
          </div>
          {!adultOk ? (
            <div className="rounded-3xl border border-orbit-pink/30 bg-orbit-pink/[0.06] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-white">Conteúdo para maiores de 18 anos</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-white/60">Sensual e provocante, mas nunca explícito. Confirme para ver a prévia.</p>
              <button
                type="button"
                onClick={() => {
                  setAdultOk(true);
                  try {
                    sessionStorage.setItem(ADULT_OK, "1");
                  } catch {
                    /* private mode */
                  }
                }}
                className="mt-4 rounded-full bg-orbit-gradient px-5 py-2 text-xs font-semibold text-snow"
              >
                Tenho 18 anos ou mais
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-6">
              {stickers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setBig(s)}
                  title={s.label}
                  className="flex aspect-square items-center justify-center rounded-2xl border border-white/[0.05] bg-white/[0.03] transition hover:border-orbit-purple/40 active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stickerPreviewUrl(s)} alt={s.label} loading="lazy" decoding="async" className="h-[84%] w-[84%] object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky action on phones, above the tab bar */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-white/10 bg-space-surface/95 px-4 py-2.5 backdrop-blur-xl md:hidden">{action}</div>

      {big && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setBig(null)} role="presentation">
          <div className="animate-pop-in w-full max-w-[300px] rounded-3xl border border-white/10 bg-space-surface p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={big.label}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={owned ? stickerFileUrl(big) : stickerPreviewUrl(big)} alt={big.label} className="mx-auto h-48 w-48 object-contain" />
            <p className="mt-2 text-sm font-semibold text-white">{big.label}</p>
            <p className="text-[11px] text-white/45">{pack.name}</p>
            <button type="button" onClick={() => setBig(null)} className="mt-4 w-full rounded-full border border-white/10 py-2 text-xs font-semibold text-white/80">
              Fechar
            </button>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center" onClick={() => setConfirm(false)} role="presentation">
          <div
            className="animate-sheet-up w-full max-w-sm rounded-t-[28px] border border-white/10 bg-space-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Confirmar compra"
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pack.coverUrl} alt="" className="h-14 w-14 rounded-2xl bg-white/5 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{pack.name}</p>
                <p className="text-xs text-white/50">{stickers.length} adesivos premium</p>
              </div>
              <button type="button" onClick={() => setConfirm(false)} aria-label="Fechar" className="rounded-full p-1.5 text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <p className="flex justify-between text-white/70">
                Preço
                <span className="flex items-center gap-1 font-semibold text-amber-500">
                  <CoinIcon className="h-4 w-4" /> {formatCoins(price)}
                </span>
              </p>
              <p className="flex justify-between text-white/70">
                Seu saldo <span className="font-semibold tabular-nums text-white">{formatCoins(balance)}</span>
              </p>
              <p className="flex justify-between text-white/70">
                Depois da compra <span className={clsx("font-semibold tabular-nums", balance - price < 0 ? "text-red-300" : "text-white")}>{formatCoins(Math.max(0, balance - price))}</span>
              </p>
            </div>
            {balance < price ? (
              <p className="mt-3 text-center text-xs text-red-300">Saldo insuficiente. Faltam {formatCoins(price - balance)} Órbita Coins.</p>
            ) : (
              <p className="mt-3 flex items-center justify-center gap-1 text-center text-[11px] text-white/45">
                <Sparkles className="h-3 w-3" /> O pack entra direto no seu seletor de adesivos.
              </p>
            )}
            <button
              type="button"
              onClick={acquire}
              disabled={busy !== null || balance < price}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow disabled:opacity-50"
            >
              {busy === "buy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmar compra
            </button>
          </div>
        </div>
      )}

      {reporting && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center" onClick={() => setReporting(false)} role="presentation">
          <div
            className="animate-sheet-up w-full max-w-sm rounded-t-[28px] border border-white/10 bg-space-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Denunciar pack"
          >
            <p className="font-semibold text-white">Denunciar “{pack.name}”</p>
            <p className="mt-1 text-xs text-white/50">Qual é o problema com este pack?</p>
            <div className="mt-3 space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => report(r)}
                  disabled={busy !== null}
                  className="w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-white/85 transition hover:border-red-400/40 hover:bg-red-400/[0.05] disabled:opacity-50"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {node}
    </div>
  );
}
