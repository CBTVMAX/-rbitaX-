"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, Check, Clock, Heart, Loader2, Package, Search, Settings2, Sparkles, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CoinIcon, formatCoins } from "@/components/coins";
import { loadFavoriteStickers, loadRecentStickers } from "@/lib/messenger/stickers";
import { loadStickers, searchStickers, stickerPreviewUrl, type Pack, type Sticker } from "@/lib/stickers/catalog";
import { useCoinBalance } from "./coin-balance";

type Category = { id: string; name: string; emoji: string; isAdult: boolean };
type LibraryRow = { packId: string; installed: boolean; source: string };

const NEW_DAYS = 30;

function PackCard({ p, owned, installed, favorite }: { p: Pack; owned: boolean; installed: boolean; favorite: boolean }) {
  const adult = p.rating === "adulto";
  return (
    <Link
      href={`/loja/adesivos/${p.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-space-surface/70 transition duration-200 hover:-translate-y-0.5 hover:border-orbit-purple/40 hover:shadow-[0_10px_30px_rgb(var(--app-accent,139_92_246)/0.16)]"
    >
      <span className="relative flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgb(var(--app-accent,139_92_246)/0.18),transparent_68%)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={clsx("h-[72%] w-[72%] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.4)] transition duration-300 group-hover:scale-105", adult && "blur-md")}
        />
        <span className="absolute left-2 top-2 flex gap-1">
          {p.exclusive && <span className="rounded-full bg-orbit-gradient px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-snow">Exclusivo</span>}
          {p.animated && <span className="rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur">Animado</span>}
          {adult && <span className="rounded-full bg-orbit-pink/90 px-1.5 py-0.5 text-[9px] font-bold text-snow">+18</span>}
        </span>
        <span className="absolute right-2 top-2 flex gap-1">
          {favorite && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-orbit-pink backdrop-blur" aria-label="Pack favorito">
              <Heart className="h-3 w-3 fill-current" />
            </span>
          )}
          {installed && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-snow" aria-label="Nos seus adesivos">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
        </span>
      </span>
      <span className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2">
        <span className="truncate text-[13px] font-semibold text-white">{p.name}</span>
        <span className="truncate text-[11px] text-white/45">
          {p.creator} · {p.stickers.length}
        </span>
        <span className="mt-1.5 flex items-center justify-between">
          {owned && p.tier === "premium" ? (
            <span className="text-[11px] font-semibold text-emerald-400">Seu</span>
          ) : p.tier === "premium" ? (
            <span className="flex items-center gap-1 text-[12px] font-bold text-amber-500">
              <CoinIcon className="h-3.5 w-3.5" /> {formatCoins(p.priceCoins ?? 0)}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-400">Grátis</span>
          )}
          {p.tier === "premium" && !owned && <Sparkles className="h-3 w-3 text-amber-500/80" aria-label="Premium" />}
        </span>
      </span>
    </Link>
  );
}

/** A titled row: swipes horizontally on phones, wraps into a grid on larger screens. */
function Shelf({ title, icon, children, more }: { title: string; icon?: React.ReactNode; children: React.ReactNode; more?: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-white">
          {icon}
          {title}
        </h2>
        {more}
      </div>
      <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-5 xl:grid-cols-6 [&>*]:w-[38vw] [&>*]:max-w-[170px] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-auto sm:[&>*]:max-w-none">
        {children}
      </div>
    </section>
  );
}

function StickerStrip({ stickers }: { stickers: Sticker[] }) {
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {stickers.map((s) => (
        <Link
          key={s.id}
          href={`/loja/adesivos/${s.packId}`}
          title={s.label}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] transition hover:border-orbit-purple/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stickerPreviewUrl(s)} alt={s.label} loading="lazy" className="h-[82%] w-[82%] object-contain" />
        </Link>
      ))}
    </div>
  );
}

export function StickerStoreView({
  packs,
  categories,
  library,
  favoritePacks,
  balance: initialBalance,
  isAdmin,
  initialCategory,
  initialQuery,
}: {
  packs: Pack[];
  categories: Category[];
  library: LibraryRow[];
  favoritePacks: string[];
  balance: number;
  isAdmin: boolean;
  initialCategory: string | null;
  initialQuery: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const live = useCoinBalance(initialBalance);
  const balance = live ?? initialBalance;
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [tier, setTier] = useState<"all" | "free" | "premium" | "mine">("all");
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{ packIds: string[]; stickers: Sticker[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<Sticker[]>([]);
  const [favStickers, setFavStickers] = useState<Sticker[]>([]);

  const lib = useMemo(() => new Map(library.map((l) => [l.packId, l])), [library]);
  const favs = useMemo(() => new Set(favoritePacks), [favoritePacks]);
  const owned = (p: Pack) => p.tier === "free" || ["purchase", "grant"].includes(lib.get(p.id)?.source ?? "");
  const installed = (p: Pack) => owned(p) && (lib.get(p.id)?.installed ?? p.isDefault);
  const card = (p: Pack) => <PackCard key={p.id} p={p} owned={owned(p)} installed={installed(p)} favorite={favs.has(p.id)} />;

  useEffect(() => {
    loadRecentStickers(supabase).then((ids) => loadStickers(supabase, ids.slice(0, 16)).then(setRecents), () => {});
    loadFavoriteStickers(supabase).then((ids) => loadStickers(supabase, ids.slice(0, 24)).then(setFavStickers), () => {});
  }, [supabase]);

  useEffect(() => {
    const q = query.trim();
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    if (category) url.searchParams.set("categoria", category);
    else url.searchParams.delete("categoria");
    window.history.replaceState(window.history.state, "", url.toString());
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchStickers(supabase, q)
        .then(setResults, () => setResults({ packIds: [], stickers: [] }))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [query, category, supabase]);

  const byTier = (list: Pack[]) =>
    list.filter((p) => (tier === "all" ? true : tier === "mine" ? installed(p) : tier === "free" ? p.tier === "free" : p.tier === "premium"));
  const filtered = byTier(category ? packs.filter((p) => p.categories.includes(category)) : packs);
  const recentCut = Date.now() - NEW_DAYS * 86400_000;
  const browsing = !category && !results && tier === "all";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-3 md:px-6 md:pt-6">
      {/* Compact header */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/loja"))}
          aria-label="Voltar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold text-white md:text-2xl">
            <span className="orbit-text-gradient">Adesivos</span>
          </h1>
          <p className="truncate text-xs text-white/50">Órbita X Store · {packs.length} packs</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3 py-1.5 text-sm">
          <CoinIcon className="h-4 w-4" />
          <span className="font-bold tabular-nums text-amber-500">{formatCoins(balance)}</span>
        </span>
        <Link
          href="/loja/meus-itens"
          aria-label="Meus itens"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-white/85 transition hover:text-white sm:flex"
        >
          <Package className="h-4 w-4" /> Meus itens
        </Link>
        {isAdmin && (
          <Link
            href="/admin/adesivos"
            aria-label="Administrar adesivos"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:text-white"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Search + filters */}
      <div className="sticky top-14 z-10 -mx-4 mt-3 bg-space-bg/85 px-4 pb-2 pt-2 backdrop-blur md:top-16 md:-mx-6 md:px-6">
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-surface/80 px-3.5 py-2.5 focus-within:border-orbit-purple/50">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar adesivos, packs, categorias ou criadores"
            aria-label="Procurar adesivos"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          ) : (
            query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="text-white/45 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </label>
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0" role="tablist" aria-label="Categorias">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              !category ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65 hover:text-white"
            )}
          >
            Tudo
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(category === c.id ? null : c.id)}
              aria-pressed={category === c.id}
              className={clsx(
                "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                category === c.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65 hover:text-white"
              )}
            >
              <span aria-hidden>{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 sm:inline-flex" role="radiogroup" aria-label="Filtro">
          {(
            [
              ["all", "Todos"],
              ["free", "Grátis"],
              ["premium", "Premium"],
              ["mine", "Meus packs"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={tier === id}
              onClick={() => setTier(id)}
              className={clsx("flex-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold transition sm:flex-none sm:px-3", tier === id ? "bg-white/[0.12] text-white" : "text-white/55 hover:text-white")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {results ? (
        <>
          {results.packIds.length > 0 && (
            <Shelf title="Packs encontrados">
              {byTier(results.packIds.map((id) => packs.find((p) => p.id === id)).filter((p): p is Pack => !!p)).map(card)}
            </Shelf>
          )}
          <section className="mt-6">
            <h2 className="mb-2.5 text-[15px] font-bold text-white">Adesivos</h2>
            {results.stickers.length ? (
              <StickerStrip stickers={results.stickers} />
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-white/50">Nenhum adesivo encontrado para “{query.trim()}”.</p>
            )}
          </section>
        </>
      ) : browsing ? (
        <>
          {(recents.length > 0 || favStickers.length > 0) && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {favStickers.length > 0 && (
                <section>
                  <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-white">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Meus favoritos
                  </h2>
                  <StickerStrip stickers={favStickers} />
                </section>
              )}
              {recents.length > 0 && (
                <section>
                  <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-white">
                    <Clock className="h-4 w-4 text-orbit-cyan" /> Usados recentemente
                  </h2>
                  <StickerStrip stickers={recents} />
                </section>
              )}
            </div>
          )}
          {packs.some((p) => p.featured) && <Shelf title="Destaques" icon={<Sparkles className="h-4 w-4 text-orbit-pink" />}>{packs.filter((p) => p.featured).map(card)}</Shelf>}
          {packs.some((p) => p.animated) && <Shelf title="✨ Adesivos animados">{packs.filter((p) => p.animated).map(card)}</Shelf>}
          {packs.some((p) => new Date(p.createdAt).getTime() > recentCut) && (
            <Shelf title="🆕 Novidades">{packs.filter((p) => new Date(p.createdAt).getTime() > recentCut).map(card)}</Shelf>
          )}
          <Shelf title="👑 Premium">{packs.filter((p) => p.tier === "premium" && p.rating !== "adulto").map(card)}</Shelf>
          <Shelf title="🎁 Grátis">{packs.filter((p) => p.tier === "free" && p.rating !== "adulto").map(card)}</Shelf>
          {packs.some((p) => favs.has(p.id)) && (
            <Shelf title="Packs favoritos" icon={<Heart className="h-4 w-4 fill-orbit-pink text-orbit-pink" />}>
              {packs.filter((p) => favs.has(p.id)).map(card)}
            </Shelf>
          )}
          {packs.some((p) => p.rating === "adulto") && (
            <Shelf title="🔞 Adulto">
              {packs.filter((p) => p.rating === "adulto").map(card)}
            </Shelf>
          )}
        </>
      ) : (
        <section className="mt-5">
          {filtered.length ? (
            <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{filtered.map(card)}</div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-white/50">
              {tier === "mine" ? "Você ainda não adicionou packs desta categoria." : "Nenhum pack nesta categoria por enquanto."}
            </p>
          )}
        </section>
      )}

      <p className="mt-10 text-center text-[11px] text-white/35">
        Conteúdo adulto no Órbita X é sempre não explícito. Órbita Coins só valem dentro do Órbita X; compras são confirmadas pelo servidor.
      </p>
    </div>
  );
}
