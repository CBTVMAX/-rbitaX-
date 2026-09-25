"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Download, Gift, Loader2, MessageCircle, Package, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CoinAmount, CoinIcon, formatCoins } from "@/components/coins";
import { ChatAvatar } from "@/components/messenger/ui";
import { invalidateStickerPacks } from "@/lib/messenger/stickers";
import { timeAgo } from "@/lib/format";
import { KIND_LABEL, RARITY_LABEL, storeErrorMessage, type StoreProduct } from "@/lib/store";
import { useCoinBalance } from "./coin-balance";
import { ProductArt, type Viewer } from "./product-art";
import { useStoreToast } from "./store-view";
import { WallpaperApplyDialog } from "./wallpaper-apply";

export type OwnedItem = { productId: string; source: string; isFavorite: boolean; acquiredAt: string; product: StoreProduct };
export type ReceivedGift = {
  id: string;
  conversationId: string | null;
  note: string | null;
  createdAt: string;
  product: { name: string; image: string } | null;
  sender: { name: string; username: string; avatarUrl: string | null } | null;
};
export type Transaction = { id: string; amount: number; balanceAfter: number; kind: string; description: string; createdAt: string };

type Tab = "colecao" | "presentes" | "extrato";
const GROUPS: { kind: StoreProduct["kind"]; label: string }[] = [
  { kind: "sticker_pack", label: "Adesivos e figurinhas" },
  { kind: "frame", label: "Molduras" },
  { kind: "wallpaper", label: "Temas e papéis de parede" },
];

export function MyItemsView({
  items: initialItems,
  gifts,
  transactions,
  balance: initialBalance,
  viewer: initialViewer,
  viewerId,
}: {
  items: OwnedItem[];
  gifts: ReceivedGift[];
  transactions: Transaction[];
  balance: number;
  viewer: Viewer;
  viewerId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("colecao");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [viewer, setViewer] = useState(initialViewer);
  const [busy, setBusy] = useState<string | null>(null);
  const [wallpaper, setWallpaper] = useState<StoreProduct | null>(null);
  const balance = useCoinBalance(initialBalance) ?? initialBalance;
  const { toast, node } = useStoreToast();

  const shown = items.filter((i) => !onlyFavorites || i.isFavorite);

  async function favorite(i: OwnedItem) {
    const { data, error } = await supabase.rpc("toggle_inventory_favorite", { p_product_id: i.productId });
    if (error) return toast("Não foi possível favoritar.", true);
    setItems((prev) => prev.map((x) => (x.productId === i.productId ? { ...x, isFavorite: !!data } : x)));
  }

  async function remove(i: OwnedItem) {
    setBusy(i.productId);
    const { error } = await supabase.rpc("remove_inventory_item", { p_product_id: i.productId });
    setBusy(null);
    if (error) return toast("Itens comprados ficam sempre com você.", true);
    if (i.product.kind === "sticker_pack") invalidateStickerPacks();
    setItems((prev) => prev.filter((x) => x.productId !== i.productId));
    toast(`${i.product.name} saiu dos seus itens.`);
  }

  async function applyFrame(frame: string | null) {
    setBusy(frame ?? "none");
    const { error } = await supabase.from("User").update({ avatarFrame: frame, updatedAt: new Date().toISOString() }).eq("id", viewerId);
    setBusy(null);
    if (error) return toast(storeErrorMessage(error.message), true);
    setViewer((v) => ({ ...v, avatarFrame: frame }));
    toast(frame ? "Moldura aplicada no seu perfil." : "Moldura removida do perfil.");
  }

  const action = "flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 md:px-6 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/loja" aria-label="Voltar para a Store" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Meus itens</h1>
            <p className="text-sm text-white/55">Tudo o que é seu no Órbita X.</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-4 py-2 text-sm">
          <CoinIcon className="h-5 w-5" />
          <span className="font-bold tabular-nums text-amber-500">{formatCoins(balance)}</span>
          <span className="text-white/60">Órbita Coins</span>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist">
        {(
          [
            ["colecao", `Coleção · ${items.length}`],
            ["presentes", `Presentes recebidos · ${gifts.length}`],
            ["extrato", "Extrato"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              tab === id ? "bg-orbit-gradient text-snow shadow-[0_0_18px_rgb(var(--app-accent,139_92_246)/0.35)]" : "border border-white/10 text-white/65 hover:text-white"
            )}
          >
            {label}
          </button>
        ))}
        {tab === "colecao" && (
          <button
            type="button"
            onClick={() => setOnlyFavorites((v) => !v)}
            aria-pressed={onlyFavorites}
            className={clsx("ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition", onlyFavorites ? "border-amber-300/50 text-amber-500" : "border-white/10 text-white/60 hover:text-white")}
          >
            <Star className={clsx("h-3.5 w-3.5", onlyFavorites && "fill-current")} /> Favoritos
          </button>
        )}
      </div>

      {tab === "colecao" &&
        (shown.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center">
            <Package className="mx-auto h-8 w-8 text-white/25" />
            <p className="mt-3 text-sm text-white/55">{onlyFavorites ? "Nenhum favorito ainda." : "Seus itens aparecem aqui quando você obtém algo na Store."}</p>
            <Link href="/loja" className="mt-4 inline-flex rounded-full bg-orbit-gradient px-5 py-2.5 text-sm font-semibold text-snow shadow-glow">
              Explorar a Store
            </Link>
          </div>
        ) : (
          GROUPS.map((g) => {
            const list = shown.filter((i) => i.product.kind === g.kind);
            if (!list.length) return null;
            return (
              <section key={g.kind} className="mt-6">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">{g.label}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((i) => {
                    const p = i.product;
                    const inUse = p.kind === "frame" && viewer.avatarFrame === p.refId;
                    return (
                      <div key={i.productId} className="flex gap-3 rounded-3xl border border-white/[0.08] bg-space-surface/70 p-3">
                        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,rgb(var(--app-accent,139_92_246)/0.2),transparent_70%)]">
                          <ProductArt p={p} viewer={viewer} size="thumb" />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-white">{p.name}</span>
                            {inUse && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Em uso</span>}
                          </span>
                          <span className="truncate text-xs text-white/45">
                            {KIND_LABEL[p.kind]}
                            {p.meta?.rarity ? ` · ${RARITY_LABEL[p.meta.rarity]}` : ""} · {i.source === "purchase" ? "Comprado" : "Grátis"}
                          </span>
                          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                            {p.kind === "frame" ? (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => applyFrame(inUse ? null : p.refId)}
                                className={clsx(action, inUse ? "border border-white/15 text-white/80" : "bg-orbit-gradient text-snow")}
                              >
                                {busy === (inUse ? "none" : p.refId) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {inUse ? "Remover" : "Usar"}
                              </button>
                            ) : p.kind === "wallpaper" ? (
                              <button type="button" onClick={() => setWallpaper(p)} className={clsx(action, "bg-orbit-gradient text-snow")}>
                                Usar
                              </button>
                            ) : (
                              <Link href="/mensagens" className={clsx(action, "bg-orbit-gradient text-snow")}>
                                <MessageCircle className="h-3.5 w-3.5" /> Usar
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => favorite(i)}
                              aria-label={i.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                              aria-pressed={i.isFavorite}
                              className={clsx(action, "w-9 border border-white/10 px-0", i.isFavorite ? "text-amber-500" : "text-white/60 hover:text-white")}
                            >
                              <Star className={clsx("h-4 w-4", i.isFavorite && "fill-current")} />
                            </button>
                            {p.kind === "wallpaper" && p.meta?.full && (
                              <a href={p.meta.full} download={`orbitax-${p.refId}.webp`} aria-label={`Baixar ${p.name}`} className={clsx(action, "w-9 border border-white/10 px-0 text-white/60 hover:text-white")}>
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                            {i.source === "free" && !inUse && (
                              <button
                                type="button"
                                disabled={busy === i.productId}
                                onClick={() => remove(i)}
                                aria-label={`Remover ${p.name} dos meus itens`}
                                className={clsx(action, "w-9 border border-white/10 px-0 text-white/45 hover:text-red-300")}
                              >
                                {busy === i.productId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        ))}

      {tab === "presentes" &&
        (gifts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center">
            <Gift className="mx-auto h-8 w-8 text-white/25" />
            <p className="mt-3 text-sm text-white/55">Os presentes que seus amigos enviarem aparecem aqui.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {gifts.map((g) => (
              <Link
                key={g.id}
                href={g.conversationId ? `/mensagens?c=${encodeURIComponent(g.conversationId)}` : "/mensagens"}
                className="flex items-center gap-3 rounded-3xl border border-white/[0.08] bg-space-surface/70 p-3 transition hover:border-orbit-purple/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.product && <img src={g.product.image} alt="" className="h-14 w-14 shrink-0 object-contain" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{g.product?.name ?? "Presente"}</span>
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    {g.sender && <ChatAvatar name={g.sender.name} url={g.sender.avatarUrl} size={18} />}
                    de {g.sender?.name ?? "alguém"} · {timeAgo(g.createdAt)}
                  </span>
                  {g.note && <span className="mt-1 block truncate text-xs italic text-white/65">“{g.note}”</span>}
                </span>
              </Link>
            ))}
          </div>
        ))}

      {tab === "extrato" && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-space-surface/70">
          {transactions.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-white/50">Nenhuma movimentação de Órbita Coins ainda.</p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0">
                <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", t.amount > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-white/70")}>
                  {t.amount > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{t.description || "Movimentação"}</span>
                  <span className="text-xs text-white/45">{timeAgo(t.createdAt)} · saldo {formatCoins(t.balanceAfter)}</span>
                </span>
                <span className={clsx("shrink-0 text-sm font-bold tabular-nums", t.amount > 0 ? "text-emerald-400" : "text-white/80")}>
                  {t.amount > 0 ? "+" : "−"}
                  <CoinAmount value={Math.abs(t.amount)} className="ml-0.5" iconClassName="h-3.5 w-3.5" />
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {wallpaper && (
        <WallpaperApplyDialog
          wallpaper={wallpaper.refId}
          name={wallpaper.name}
          open
          onClose={() => setWallpaper(null)}
          onDone={(text, err) => {
            toast(text, err);
            if (!err) setWallpaper(null);
          }}
        />
      )}
      {node}
    </div>
  );
}
