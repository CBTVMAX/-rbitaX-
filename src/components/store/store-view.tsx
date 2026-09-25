"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Gift, Loader2, Lock, MessageCircle, Package, Sparkles, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CoinAmount, CoinIcon, formatCoins } from "@/components/coins";
import { Modal } from "@/components/messenger/ui";
import { invalidateStickerPacks, stickerPreviewSrc } from "@/lib/messenger/stickers";
import {
  announceBalance,
  inCategory,
  KIND_LABEL,
  RARITY_LABEL,
  STORE_CATEGORIES,
  storeErrorMessage,
  type InventoryItem,
  type StoreCategory,
  type StoreProduct,
} from "@/lib/store";
import { useCoinBalance } from "./coin-balance";
import { ProductArt, type Viewer } from "./product-art";
import { WallpaperApplyDialog } from "./wallpaper-apply";

type PackInfo = { id: string; stickers: string[]; animated: boolean };
type Toast = { id: number; text: string; error?: boolean };

export function useStoreToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (text: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-1), { id, text, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), error ? 4500 : 2800);
  };
  const node = (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-8">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "animate-pop-in flex max-w-md items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl",
            t.error ? "border-red-500/40 bg-space-surface/95 text-red-300" : "border-white/10 bg-space-surface/95 text-white"
          )}
        >
          {t.error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
          {t.text}
        </div>
      ))}
    </div>
  );
  return { toast, node };
}

export function PriceTag({ p, owned, className }: { p: StoreProduct; owned: boolean; className?: string }) {
  if (owned)
    return (
      <span className={clsx("inline-flex items-center gap-1 text-xs font-semibold text-emerald-400", className)}>
        <Check className="h-3.5 w-3.5" /> Seu
      </span>
    );
  if (p.kind === "gift" && !p.priceCoins) return <span className={clsx("text-xs font-semibold text-emerald-400", className)}>Grátis para enviar</span>;
  return p.priceCoins ? (
    <CoinAmount value={p.priceCoins} className={clsx("text-sm text-amber-500", className)} iconClassName="h-4 w-4" />
  ) : (
    <span className={clsx("text-xs font-semibold text-emerald-400", className)}>Grátis</span>
  );
}

function ProductCard({ p, owned, favorite, viewer, onOpen }: { p: StoreProduct; owned: boolean; favorite: boolean; viewer: Viewer; onOpen: () => void }) {
  const rarity = p.meta?.rarity ? RARITY_LABEL[p.meta.rarity] : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-space-surface/70 text-left transition duration-200 hover:-translate-y-0.5 hover:border-orbit-purple/40 hover:shadow-[0_12px_36px_rgb(var(--app-accent,139_92_246)/0.18)] focus-visible:border-orbit-purple/60"
    >
      <span
        className={clsx(
          "relative block aspect-square overflow-hidden",
          p.kind === "wallpaper" ? "bg-space-bg" : "bg-[radial-gradient(circle_at_50%_40%,rgb(var(--app-accent,139_92_246)/0.18),transparent_65%)]"
        )}
      >
        <span className="absolute inset-0 transition duration-300 group-hover:scale-[1.04]">
          <ProductArt p={p} viewer={viewer} />
        </span>
        <span className="absolute left-2.5 top-2.5 flex gap-1">
          {p.badge && <span className="rounded-full bg-orbit-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-snow shadow">{p.badge}</span>}
          {p.isAdult && <span className="rounded-full bg-orbit-pink/90 px-1.5 py-0.5 text-[10px] font-bold text-snow">+18</span>}
          {rarity && <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">{rarity}</span>}
        </span>
        {(owned || favorite) && (
          <span className="absolute right-2.5 top-2.5 flex gap-1">
            {favorite && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-amber-500 backdrop-blur" aria-label="Favorito">
                <Star className="h-3.5 w-3.5 fill-current" />
              </span>
            )}
            {owned && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-snow shadow" aria-label="Na sua coleção">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            )}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <span className="truncate text-sm font-semibold text-white">{p.name}</span>
        <span className="mt-0.5 line-clamp-1 text-xs text-white/50">{p.description}</span>
        <span className="mt-2.5 flex items-center justify-between">
          <PriceTag p={p} owned={owned} />
          {p.tier === "premium" && !owned && <Sparkles className="h-3.5 w-3.5 text-amber-500/80" aria-label="Premium" />}
        </span>
      </span>
    </button>
  );
}

export function ProductSheet({
  p,
  owned,
  balance,
  viewer,
  viewerId,
  pack,
  onClose,
  onAcquired,
  onViewerFrame,
  toast,
}: {
  p: StoreProduct;
  owned: boolean;
  balance: number | null;
  viewer: Viewer;
  viewerId: string;
  pack?: PackInfo;
  onClose: () => void;
  onAcquired: (productId: string, balance: number) => void;
  onViewerFrame: (frame: string | null) => void;
  toast: (text: string, error?: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [wallOpen, setWallOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const rarity = p.meta?.rarity ? RARITY_LABEL[p.meta.rarity] : null;
  const short = balance !== null && p.priceCoins > balance;
  const inUse = p.kind === "frame" && viewer.avatarFrame === p.refId;

  async function acquire() {
    setStep("busy");
    setError(null);
    const { data, error: e } = await supabase.rpc("acquire_product", { p_product_id: p.id });
    if (e) {
      setStep("idle");
      setError(storeErrorMessage(e.message));
      return;
    }
    const result = (data ?? {}) as { balance?: number };
    const next = typeof result.balance === "number" ? result.balance : balance ?? 0;
    if (p.kind === "sticker_pack") invalidateStickerPacks();
    announceBalance(next);
    onAcquired(p.id, next);
    setStep("done");
  }

  async function applyFrame(frame: string | null) {
    setApplying(true);
    const { error: e } = await supabase.from("User").update({ avatarFrame: frame, updatedAt: new Date().toISOString() }).eq("id", viewerId);
    setApplying(false);
    if (e) return toast(storeErrorMessage(e.message), true);
    onViewerFrame(frame);
    toast(frame ? "Moldura aplicada no seu perfil." : "Moldura removida.");
  }

  const ownedNow = owned || step === "done";

  const primary = (() => {
    if (p.kind === "gift") {
      return (
        <Link href="/mensagens" className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow transition hover:opacity-95">
          <MessageCircle className="h-4 w-4" /> Enviar pelo Messenger
        </Link>
      );
    }
    if (ownedNow) {
      if (p.kind === "frame")
        return inUse ? (
          <button type="button" disabled={applying} onClick={() => applyFrame(null)} className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/85 transition hover:border-white/30">
            {applying && <Loader2 className="h-4 w-4 animate-spin" />} Em uso · Remover do perfil
          </button>
        ) : (
          <button type="button" disabled={applying} onClick={() => applyFrame(p.refId)} className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow">
            {applying && <Loader2 className="h-4 w-4 animate-spin" />} Usar no meu perfil
          </button>
        );
      if (p.kind === "wallpaper")
        return (
          <button type="button" onClick={() => setWallOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow">
            Usar em uma conversa
          </button>
        );
      return (
        <Link href="/mensagens" className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow">
          <MessageCircle className="h-4 w-4" /> Usar no Messenger
        </Link>
      );
    }
    if (step === "confirm")
      return (
        <div className="w-full space-y-2">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3 text-sm">
            <div className="flex items-center justify-between text-white/70">
              <span>Preço</span>
              <CoinAmount value={p.priceCoins} className="text-amber-500" />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-white/70">
              <span>Saldo depois da compra</span>
              <CoinAmount value={(balance ?? 0) - p.priceCoins} className="text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("idle")} className="flex-1 rounded-full border border-white/15 py-3 text-sm font-semibold text-white/80 hover:border-white/30">
              Cancelar
            </button>
            <button type="button" onClick={acquire} className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow">
              Confirmar compra
            </button>
          </div>
        </div>
      );
    if (p.priceCoins > 0)
      return (
        <button
          type="button"
          disabled={short || step === "busy" || balance === null}
          onClick={() => setStep("confirm")}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow transition disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {step === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : short ? <Lock className="h-4 w-4" /> : <CoinIcon className="h-4 w-4" />}
          {short ? "Saldo insuficiente" : `Comprar por ${formatCoins(p.priceCoins)}`}
        </button>
      );
    return (
      <button
        type="button"
        disabled={step === "busy"}
        onClick={acquire}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow disabled:opacity-60"
      >
        {step === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} Obter grátis
      </button>
    );
  })();

  return (
    <Modal open onClose={onClose} size="lg">
      <div className="-mx-5 -mt-1 grid gap-0 md:grid-cols-[1.05fr_1fr]">
        <div
          className={clsx(
            "relative flex aspect-square items-center justify-center overflow-hidden md:aspect-auto md:min-h-[380px] md:rounded-bl-3xl",
            p.kind === "wallpaper" ? "bg-space-bg" : "bg-[radial-gradient(circle_at_50%_45%,rgb(var(--app-accent,139_92_246)/0.22),transparent_68%)]"
          )}
        >
          <ProductArt p={p} viewer={viewer} size="large" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 z-[1] flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/85 backdrop-blur transition hover:bg-black/60 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          {step === "done" && (
            <span className="animate-pop-in absolute inset-0 flex flex-col items-center justify-center bg-space-bg/55 backdrop-blur-[2px]">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-snow shadow-[0_0_40px_rgba(16,185,129,0.6)]">
                <Check className="h-8 w-8" strokeWidth={3} />
              </span>
              <span className="mt-3 text-sm font-semibold text-white">Agora é seu! ✨</span>
            </span>
          )}
        </div>
        <div className="relative flex flex-col px-5 pb-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 hidden h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/5 hover:text-white md:flex"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            {p.kind === "gift" ? <Gift className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
            {KIND_LABEL[p.kind]}
            {rarity && <span className="rounded-full border border-white/15 px-2 py-0.5 normal-case tracking-normal text-white/75">{rarity}</span>}
            {p.isAdult && <span className="rounded-full bg-orbit-pink/90 px-1.5 py-0.5 text-snow">+18</span>}
          </span>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-white">{p.name}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/60">{p.description}</p>

          {pack && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {pack.stickers.length} {pack.animated ? "adesivos animados" : "figurinhas"}
              </p>
              <div className="grid grid-cols-6 gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2">
                {pack.stickers.slice(0, 12).map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s} src={stickerPreviewSrc(`${pack.id}/${s}`)} alt="" loading="lazy" className="aspect-square w-full object-contain" />
                ))}
              </div>
            </div>
          )}
          {p.kind === "gift" && <p className="mt-4 rounded-2xl bg-white/[0.04] px-3 py-2.5 text-xs text-white/60">No Messenger, toque em + → Presente e escolha para quem enviar.</p>}
          {p.kind === "frame" && <p className="mt-4 text-xs text-white/45">Prévia com a sua foto. A moldura aparece no perfil, no feed e no Messenger.</p>}

          <div className="mt-auto pt-5">
            <div className="mb-3 flex items-center justify-between">
              <PriceTag p={p} owned={ownedNow && p.kind !== "gift"} className="text-base" />
              {balance !== null && p.priceCoins > 0 && !ownedNow && (
                <span className="text-xs text-white/45">
                  Saldo: <span className="font-semibold text-amber-500">{formatCoins(balance)}</span>
                </span>
              )}
            </div>
            {primary}
            {short && !ownedNow && (
              <p className="mt-2 text-center text-[11px] text-white/45">A compra de Órbita Coins chega em breve.</p>
            )}
            {error && <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">{error}</p>}
          </div>
        </div>
      </div>
      {p.kind === "wallpaper" && (
        <WallpaperApplyDialog
          wallpaper={p.refId}
          name={p.name}
          open={wallOpen}
          onClose={() => setWallOpen(false)}
          onDone={(text, err) => {
            toast(text, err);
            if (!err) setWallOpen(false);
          }}
        />
      )}
    </Modal>
  );
}

export function StoreView({
  products,
  inventory: initialInventory,
  balance: initialBalance,
  viewer: initialViewer,
  viewerId,
  packs,
  initialCategory,
  initialProduct,
}: {
  products: StoreProduct[];
  inventory: InventoryItem[];
  balance: number;
  viewer: Viewer;
  viewerId: string;
  packs: PackInfo[];
  initialCategory: StoreCategory;
  initialProduct: string | null;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<StoreCategory>(initialCategory);
  const [tier, setTier] = useState<"all" | "free" | "premium">("all");
  const [inventory, setInventory] = useState(initialInventory);
  const [viewer, setViewer] = useState(initialViewer);
  const [open, setOpen] = useState<string | null>(initialProduct);
  const live = useCoinBalance(initialBalance);
  const balance = live ?? initialBalance;
  const { toast, node } = useStoreToast();

  const owned = useMemo(() => new Map(inventory.map((i) => [i.productId, i])), [inventory]);
  const packById = useMemo(() => new Map(packs.map((p) => [p.id, p])), [packs]);
  const visible = products.filter((p) => inCategory(p, category) && (tier === "all" || p.tier === tier));
  const current = products.find((p) => p.id === open) ?? null;

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("categoria", category);
    if (open) url.searchParams.set("produto", open);
    else url.searchParams.delete("produto");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [category, open]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 md:px-6 md:pt-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-space-surface/70 p-5 md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-orbit-purple/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-orbit-blue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute right-8 top-6 hidden h-28 w-28 rounded-full border border-white/10 md:block">
          <span className="absolute -inset-4 rounded-full border border-dashed border-white/[0.07]" />
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orbit-pink shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
        </div>
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/feed"))}
              aria-label="Voltar"
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                <span className="orbit-text-gradient">Órbita X</span> <span className="text-white">Store</span>
              </h1>
              <p className="mt-1 text-sm text-white/60">Personalize seu universo.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-4 py-2 text-sm">
              <CoinIcon className="h-5 w-5" />
              <span className="font-bold tabular-nums text-amber-500">{formatCoins(balance)}</span>
              <span className="text-white/60">Órbita Coins</span>
            </span>
            <Link
              href="/loja/meus-itens"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-orbit-purple/50 hover:text-white"
            >
              <Package className="h-4 w-4" /> Meus itens
            </Link>
          </div>
        </div>
      </div>

      <div className="sticky top-14 z-10 -mx-4 mt-4 bg-space-bg/85 px-4 pb-2 pt-2 backdrop-blur md:top-16 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" role="tablist" aria-label="Categorias">
            {STORE_CATEGORIES.map((c) => {
              const on = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setCategory(c.id)}
                  className={clsx(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                    on ? "bg-orbit-gradient text-snow shadow-[0_0_18px_rgb(var(--app-accent,139_92_246)/0.35)]" : "border border-white/10 text-white/65 hover:border-white/25 hover:text-white"
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 self-start rounded-full border border-white/10 bg-white/[0.03] p-1 md:self-auto" role="radiogroup" aria-label="Preço">
            {(
              [
                ["all", "Todos"],
                ["free", "Grátis"],
                ["premium", "Premium"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={tier === id}
                onClick={() => setTier(id)}
                className={clsx("rounded-full px-3 py-1 text-xs font-semibold transition", tier === id ? "bg-white/[0.12] text-white" : "text-white/55 hover:text-white")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-white/25" />
          <p className="mt-3 text-sm text-white/55">
            {tier === "premium" ? "Nenhum item premium nesta categoria por enquanto." : tier === "free" ? "Nenhum item grátis nesta categoria." : "Novidades chegando em breve."}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((p) => (
            <ProductCard key={p.id} p={p} owned={owned.has(p.id)} favorite={!!owned.get(p.id)?.isFavorite} viewer={viewer} onOpen={() => setOpen(p.id)} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-white/35">
        Órbita Coins não são dinheiro e só valem dentro do Órbita X. Compras são confirmadas pelo servidor.
      </p>

      {current && (
        <ProductSheet
          key={current.id}
          p={current}
          owned={owned.has(current.id)}
          balance={balance}
          viewer={viewer}
          viewerId={viewerId}
          pack={current.kind === "sticker_pack" ? packById.get(current.refId) : undefined}
          onClose={() => setOpen(null)}
          onAcquired={(id) => {
            setInventory((prev) => [...prev, { productId: id, source: current.priceCoins > 0 ? "purchase" : "free", isFavorite: false, acquiredAt: new Date().toISOString() }]);
            toast(current.priceCoins > 0 ? `Compra concluída: ${current.name}.` : `${current.name} adicionado aos seus itens.`);
          }}
          onViewerFrame={(frame) => setViewer((v) => ({ ...v, avatarFrame: frame }))}
          toast={toast}
        />
      )}
      {node}
    </div>
  );
}
