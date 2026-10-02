"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, Check, ChevronRight, Clock, Heart, Loader2, Package, Plus, Search, Settings2, Sparkles, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CoinIcon, formatCoins } from "@/components/coins";
import { loadFavoriteStickers, loadPopularStickers, loadRecentStickers } from "@/lib/messenger/stickers";
import { loadStickers, searchStickers, stickerPreviewUrl, type Pack, type Sticker } from "@/lib/stickers/catalog";
import { useCoinBalance } from "./coin-balance";

type Category = { id: string; name: string; emoji: string; isAdult: boolean };
type LibraryRow = { packId: string; installed: boolean; source: string };
type Tab = "para-voce" | "em-alta" | "gratis" | "animados" | "premium" | "meus";

const NEW_DAYS = 30;
const TABS: { id: Tab; label: string }[] = [
  { id: "para-voce", label: "Para você" },
  { id: "em-alta", label: "Em alta" },
  { id: "gratis", label: "Grátis" },
  { id: "animados", label: "Animados" },
  { id: "premium", label: "Premium" },
  { id: "meus", label: "Meus packs" },
];

/** Abre um pack: página própria na loja, ou dentro do chat (sem sair da conversa). */
function PackLink({ id, onOpen, className, children, title }: { id: string; onOpen?: (id: string) => void; className?: string; children: React.ReactNode; title?: string }) {
  if (onOpen)
    return (
      <button type="button" onClick={() => onOpen(id)} className={clsx("text-left", className)} title={title}>
        {children}
      </button>
    );
  return (
    <Link href={`/loja/adesivos/${id}`} className={className} title={title}>
      {children}
    </Link>
  );
}

function Price({ p, owned }: { p: Pack; owned: boolean }) {
  if (owned && p.tier === "premium") return <span className="text-[12px] font-semibold text-emerald-400">Seu</span>;
  if (p.tier === "premium")
    return (
      <span className="flex items-center gap-1 text-[12px] font-bold text-amber-400">
        <CoinIcon className="h-3.5 w-3.5" /> {formatCoins(p.priceCoins ?? 0)}
      </span>
    );
  return <span className="text-[12px] font-semibold text-emerald-400">Grátis</span>;
}

function PackCard({ p, owned, installed, favorite, onOpen }: { p: Pack; owned: boolean; installed: boolean; favorite: boolean; onOpen?: (id: string) => void }) {
  const adult = p.rating === "adulto";
  return (
    <PackLink id={p.id} onOpen={onOpen} className="group flex w-full flex-col">
      <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_38%,rgb(var(--app-accent,139_92_246)/0.28),transparent_70%),linear-gradient(160deg,rgb(var(--c-space-card,17_21_42)),rgb(var(--c-space-surface,11_14_28)))] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-orbit-purple/50 group-hover:shadow-[0_12px_30px_rgb(var(--app-accent,139_92_246)/0.22)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={clsx("h-[78%] w-[78%] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] transition duration-300 group-hover:scale-[1.06]", adult && "blur-md")}
        />
        <span className="absolute left-2 top-2 flex flex-wrap gap-1">
          {p.exclusive && <span className="rounded-full bg-orbit-gradient px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-snow">Exclusivo</span>}
          {p.animated && <span className="rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-snow backdrop-blur">Animado</span>}
          {adult && <span className="rounded-full bg-orbit-pink/90 px-1.5 py-0.5 text-[9px] font-bold text-snow">+18</span>}
        </span>
        <span className="absolute right-2 top-2 flex gap-1">
          {favorite && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-orbit-pink backdrop-blur" aria-label="Pack favorito">
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
      <span className="mt-2 truncate px-0.5 text-[13px] font-semibold text-white">{p.name}</span>
      <span className="truncate px-0.5 text-[11px] text-white/45">{p.creator}</span>
      <span className="mt-0.5 px-0.5">
        <Price p={p} owned={owned} />
      </span>
    </PackLink>
  );
}

/** Fileira com título: desliza no celular e vira grade no computador. */
function Shelf({ title, icon, children, more, row = false }: { title: string; icon?: React.ReactNode; children: React.ReactNode; more?: React.ReactNode; row?: boolean }) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[16px] font-bold text-white">
          {icon}
          {title}
        </h2>
        {more}
      </div>
      <div
        className={clsx(
          "-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-5 [&>*]:w-[36vw] [&>*]:max-w-[160px] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-auto sm:[&>*]:max-w-none",
          // Vitrine: uma linha cheia no computador (o resto fica em "Ver todos"); no celular, desliza.
          row && "sm:[&>*:nth-child(n+5)]:hidden lg:[&>*:nth-child(5)]:flex"
        )}
      >
        {children}
      </div>
    </section>
  );
}

function SeeAll({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-0.5 text-[13px] font-medium text-orbit-blue transition hover:text-white">
      Ver todos <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function StickerStrip({ stickers, onOpen }: { stickers: Sticker[]; onOpen?: (id: string) => void }) {
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {stickers.map((s) => (
        <PackLink
          key={s.id}
          id={s.packId}
          onOpen={onOpen}
          title={s.label}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] transition hover:border-orbit-purple/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stickerPreviewUrl(s)} alt={s.label} loading="lazy" className="h-[82%] w-[82%] object-contain" />
        </PackLink>
      ))}
    </div>
  );
}

/** Destaque do topo, como no VK/Telegram: a coleção oficial com a arte do ÓrbitaX. */
function Hero({ pack, onOpen }: { pack: Pack | undefined; onOpen?: (id: string) => void }) {
  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[#07061a] text-snow" style={{ "--c-ink": "255 255 255" } as React.CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/messenger/empty-space.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[60%_30%]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07061a] via-[#07061a]/80 to-transparent" />
      <div className="relative flex min-h-[176px] items-center gap-4 p-5 sm:min-h-[210px] sm:p-7">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-snow/60">Adesivos oficiais</p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">Coleção Órbita X</h2>
          <p className="mt-1.5 max-w-xs text-sm text-snow/75">Explore o universo em cada emoção.</p>
          {pack && (
            <PackLink
              id={pack.id}
              onOpen={onOpen}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2b6cff] to-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-snow shadow-[0_8px_26px_rgba(80,110,255,0.45)] transition hover:brightness-110"
            >
              Ver coleção <ChevronRight className="h-4 w-4" />
            </PackLink>
          )}
        </div>
        {pack && (
          <span className="relative hidden h-36 w-36 shrink-0 items-center justify-center min-[460px]:flex sm:h-44 sm:w-44">
            <span aria-hidden className="absolute inset-4 rounded-full bg-orbit-purple/40 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pack.coverUrl} alt="" className="relative h-full w-full animate-[ox-float_5s_ease-in-out_infinite] object-contain drop-shadow-[0_14px_30px_rgba(0,0,0,0.55)]" />
          </span>
        )}
      </div>
    </section>
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
  embedded = false,
  onOpenPack,
  onClose,
}: {
  packs: Pack[];
  categories: Category[];
  library: LibraryRow[];
  favoritePacks: string[];
  balance: number;
  isAdmin: boolean;
  initialCategory: string | null;
  initialQuery: string;
  /** Dentro do chat: sem mexer na URL, sem cabeçalho fixo da página, e com "Fechar". */
  embedded?: boolean;
  onOpenPack?: (id: string) => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const live = useCoinBalance(initialBalance);
  const balance = live ?? initialBalance;
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [tab, setTab] = useState<Tab>("para-voce");
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{ packIds: string[]; stickers: Sticker[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<Sticker[]>([]);
  const [favStickers, setFavStickers] = useState<Sticker[]>([]);
  const [popularPacks, setPopularPacks] = useState<string[]>([]);

  const lib = useMemo(() => new Map(library.map((l) => [l.packId, l])), [library]);
  const favs = useMemo(() => new Set(favoritePacks), [favoritePacks]);
  const owned = (p: Pack) => p.tier === "free" || ["purchase", "grant"].includes(lib.get(p.id)?.source ?? "");
  const installed = (p: Pack) => owned(p) && (lib.get(p.id)?.installed ?? p.isDefault);
  const card = (p: Pack) => <PackCard key={p.id} p={p} owned={owned(p)} installed={installed(p)} favorite={favs.has(p.id)} onOpen={onOpenPack} />;

  useEffect(() => {
    loadRecentStickers(supabase).then((ids) => loadStickers(supabase, ids.slice(0, 16)).then(setRecents), () => {});
    loadFavoriteStickers(supabase).then((ids) => loadStickers(supabase, ids.slice(0, 24)).then(setFavStickers), () => {});
    // "Mais usados": os packs dos adesivos mais enviados no ÓrbitaX.
    loadPopularStickers(supabase).then(
      (ids) => setPopularPacks([...new Set(ids.map((id) => id.split("/")[0]))]),
      () => {}
    );
  }, [supabase]);

  useEffect(() => {
    const q = query.trim();
    if (!embedded) {
      const url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      if (category) url.searchParams.set("categoria", category);
      else url.searchParams.delete("categoria");
      window.history.replaceState(window.history.state, "", url.toString());
    }
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
  }, [query, category, supabase, embedded]);

  const safe = packs.filter((p) => p.rating !== "adulto");
  const recentCut = Date.now() - NEW_DAYS * 86400_000;
  const byId = new Map(packs.map((p) => [p.id, p]));
  const mostUsed = (() => {
    const list = popularPacks.map((id) => byId.get(id)).filter((p): p is Pack => !!p && p.rating !== "adulto");
    return list.length ? list : safe.filter((p) => p.isDefault || p.featured);
  })();
  const trending = [
    ...safe.filter((p) => p.featured),
    ...safe.filter((p) => new Date(p.createdAt).getTime() > recentCut),
    ...mostUsed,
  ].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
  const hero = packs.find((p) => p.featured && p.rating !== "adulto") ?? mostUsed[0] ?? safe[0];

  const byTab = (list: Pack[]) => {
    switch (tab) {
      case "em-alta":
        return trending.filter((p) => list.includes(p));
      case "gratis":
        return list.filter((p) => p.tier === "free");
      case "animados":
        return list.filter((p) => p.animated);
      case "premium":
        return list.filter((p) => p.tier === "premium");
      case "meus":
        return list.filter((p) => installed(p));
      default:
        return list;
    }
  };
  const inCategory = category ? packs.filter((p) => p.categories.includes(category)) : packs;
  const filtered = byTab(inCategory);
  const browsing = !category && !results && tab === "para-voce";
  const catName = categories.find((c) => c.id === category);

  return (
    <div className={clsx("mx-auto max-w-6xl px-4 pb-12 md:px-6", embedded ? "pt-4" : "pt-3 md:pt-6")}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-2.5">
        {!embedded && (
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/loja"))}
            aria-label="Voltar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Órbita X Store</p>
          <h1 className="truncate font-display text-lg font-bold text-white sm:text-xl md:text-2xl">Loja de Adesivos</h1>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] py-1 pl-3 pr-1 text-sm">
          <CoinIcon className="h-4 w-4" />
          <span className="font-bold tabular-nums text-amber-400">{formatCoins(balance)}</span>
          <Link
            href="/diamantes"
            aria-label="Comprar Órbita Coins"
            title="Comprar Órbita Coins"
            className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-orbit-blue text-snow transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          </Link>
        </span>
        <Link
          href="/loja/meus-itens"
          aria-label="Meus itens"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-white/85 transition hover:text-white sm:flex"
        >
          <Package className="h-4 w-4" /> Meus itens
        </Link>
        {isAdmin && !embedded && (
          <Link
            href="/admin/adesivos"
            aria-label="Administrar adesivos"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:text-white"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        )}
        {embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar loja"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Busca + abas */}
      <div className={clsx("z-10 -mx-4 mt-3 bg-space-bg/85 px-4 pb-2 pt-2 backdrop-blur md:-mx-6 md:px-6", embedded ? "sticky top-0" : "sticky top-14 md:top-14")}>
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-surface/80 px-3.5 py-2.5 focus-within:border-orbit-purple/50">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pacotes, criadores ou temas..."
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
        <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0" role="tablist" aria-label="Seções da loja">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => (setTab(t.id), setQuery(""))}
              className={clsx(
                "shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition",
                tab === t.id ? "bg-orbit-blue text-snow shadow-[0_6px_18px_rgba(43,108,255,0.35)]" : "text-white/65 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {catName && (
          <div className="mt-2 flex">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-3 py-1 text-xs font-semibold text-snow"
            >
              <span aria-hidden>{catName.emoji}</span> {catName.name} <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {results ? (
        <>
          {results.packIds.length > 0 && (
            <Shelf title="Pacotes encontrados">
              {results.packIds
                .map((id) => byId.get(id))
                .filter((p): p is Pack => !!p)
                .map(card)}
            </Shelf>
          )}
          <section className="mt-6">
            <h2 className="mb-2.5 text-[16px] font-bold text-white">Adesivos</h2>
            {results.stickers.length ? (
              <StickerStrip stickers={results.stickers} onOpen={onOpenPack} />
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-white/50">Nenhum adesivo encontrado para “{query.trim()}”.</p>
            )}
          </section>
        </>
      ) : browsing ? (
        <>
          <Hero pack={hero} onOpen={onOpenPack} />

          {(recents.length > 0 || favStickers.length > 0) && (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {favStickers.length > 0 && (
                <section>
                  <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-white">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Meus favoritos
                  </h2>
                  <StickerStrip stickers={favStickers} onOpen={onOpenPack} />
                </section>
              )}
              {recents.length > 0 && (
                <section>
                  <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-white">
                    <Clock className="h-4 w-4 text-orbit-cyan" /> Usados recentemente
                  </h2>
                  <StickerStrip stickers={recents} onOpen={onOpenPack} />
                </section>
              )}
            </div>
          )}

          {mostUsed.length > 0 && <Shelf title="Mais usados" row>{mostUsed.slice(0, 10).map(card)}</Shelf>}
          {trending.length > 0 && <Shelf title="Em alta" row more={<SeeAll onClick={() => setTab("em-alta")} />}>{trending.slice(0, 10).map(card)}</Shelf>}

          {categories.length > 0 && (
            <section className="mt-7">
              <h2 className="mb-3 text-[16px] font-bold text-white">Temas</h2>
              <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-6">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => (setCategory(c.id), setTab("para-voce"), setQuery(""))}
                    className="flex w-[26vw] max-w-[120px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-[linear-gradient(160deg,rgb(var(--c-space-card,17_21_42)),rgb(var(--c-space-surface,11_14_28)))] px-2 py-4 text-center transition hover:-translate-y-0.5 hover:border-orbit-purple/50 sm:w-auto sm:max-w-none"
                  >
                    <span aria-hidden className="text-[34px] leading-none drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]">
                      {c.emoji}
                    </span>
                    <span className="w-full truncate text-[12px] font-semibold text-white/85">{c.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {safe.some((p) => p.animated) && <Shelf title="Animados" row more={<SeeAll onClick={() => setTab("animados")} />}>{safe.filter((p) => p.animated).slice(0, 10).map(card)}</Shelf>}
          {safe.some((p) => p.tier === "premium") && (
            <Shelf title="Premium" row icon={<Sparkles className="h-4 w-4 text-amber-400" />} more={<SeeAll onClick={() => setTab("premium")} />}>
              {safe.filter((p) => p.tier === "premium").slice(0, 10).map(card)}
            </Shelf>
          )}
          <Shelf title="Grátis" row more={<SeeAll onClick={() => setTab("gratis")} />}>
            {safe.filter((p) => p.tier === "free").slice(0, 10).map(card)}
          </Shelf>
          {packs.some((p) => favs.has(p.id)) && (
            <Shelf title="Packs favoritos" icon={<Heart className="h-4 w-4 fill-orbit-pink text-orbit-pink" />}>
              {packs.filter((p) => favs.has(p.id)).map(card)}
            </Shelf>
          )}
          {packs.some((p) => p.rating === "adulto") && <Shelf title="🔞 Adulto">{packs.filter((p) => p.rating === "adulto").map(card)}</Shelf>}
        </>
      ) : (
        <section className="mt-5">
          {filtered.length ? (
            <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">{filtered.map(card)}</div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-white/50">
              {tab === "meus" ? "Você ainda não adicionou pacotes aqui." : "Nenhum pacote aqui por enquanto."}
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
