"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Check, Clock, Flame, ImagePlus, Loader2, Lock, Play, Plus, Search, Send, ShoppingBag, Star, X } from "lucide-react";
import { EMOJI_CATEGORIES, recentEmoji, rememberEmoji } from "@/lib/messenger/emoji";
import {
  loadFavoriteStickers,
  loadPopularStickers,
  loadRecentStickers,
  rememberSticker,
  toggleFavoriteSticker,
} from "@/lib/messenger/stickers";
import {
  isAvailable,
  isOwned,
  loadLibrary,
  loadPackStickers,
  loadPacks,
  loadStickers,
  searchStickers,
  setPackInstalled,
  stickerFileUrl,
  stickerPreviewUrl,
  type Library,
  type Pack,
  type Sticker,
} from "@/lib/stickers/catalog";
import { useSignedUrl } from "@/lib/messenger/media";
import type { Attachment, StickerInfo } from "@/lib/messenger/types";
import { CoinIcon, formatCoins } from "@/components/coins";
import { useMessenger } from "./context";

export type PanelTab = "emoji" | "stickers" | "gif" | "favoritos";

const TABS: { id: PanelTab; label: string; icon: string }[] = [
  { id: "emoji", label: "Emojis", icon: "😀" },
  { id: "stickers", label: "Adesivos", icon: "✨" },
  { id: "gif", label: "GIFs", icon: "" },
  { id: "favoritos", label: "Favoritos", icon: "❤️" },
];

export function stickerInfo(s: Sticker): StickerInfo {
  return { storage: s.storage, file: s.file, preview: s.preview, format: s.format, w: s.width, h: s.height, size: s.size, label: s.label };
}

function GifThumb({ a, onPick }: { a: Attachment; onPick: () => void }) {
  const src = useSignedUrl(a.path);
  if (src === "") return null;
  return (
    <button type="button" onClick={onPick} className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.06] transition hover:opacity-90 active:scale-95" aria-label="Enviar GIF">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full animate-pulse" />
      )}
    </button>
  );
}

function AdultTag({ className }: { className?: string }) {
  return (
    <span className={clsx("rounded-md bg-orbit-pink/90 px-1 text-[9px] font-bold leading-4 text-snow", className)} aria-label="Conteúdo +18">
      +18
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-8 py-10 text-center text-xs leading-relaxed text-white/45">{children}</p>;
}

/** One sticker: tap sends, star favorites, long press / right click opens the big preview. Animates only on hover. */
function StickerCell({
  s,
  locked,
  favorite,
  onSend,
  onFavorite,
  onPreview,
}: {
  s: Sticker;
  locked: boolean;
  favorite: boolean;
  onSend: () => void;
  onFavorite: () => void;
  onPreview: () => void;
}) {
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const animated = s.format === "animated";
  const preview = stickerPreviewUrl(s);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          if (locked) onPreview();
          else onSend();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onPreview();
        }}
        onTouchStart={() => {
          longPressed.current = false;
          press.current = setTimeout(() => {
            longPressed.current = true;
            navigator.vibrate?.(10);
            onPreview();
          }, 380);
        }}
        onTouchMove={() => press.current && clearTimeout(press.current)}
        onTouchEnd={() => press.current && clearTimeout(press.current)}
        className={clsx(
          "flex aspect-square w-full select-none items-center justify-center rounded-2xl transition",
          locked ? "cursor-pointer" : "hover:bg-white/[0.06] active:scale-90"
        )}
        aria-label={locked ? `${s.label} (pack premium)` : `Enviar ${s.label}`}
        title={s.label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={clsx("pointer-events-none h-[84%] w-[84%] object-contain", locked && "opacity-60 saturate-[0.8]")}
          onMouseEnter={(e) => animated && !locked && (e.currentTarget.src = stickerFileUrl(s))}
          onMouseLeave={(e) => animated && !locked && (e.currentTarget.src = preview)}
        />
        {animated && !locked && (
          <span aria-hidden className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur group-hover:opacity-0">
            <Play className="ml-px h-2 w-2 fill-current" />
          </span>
        )}
        {locked && (
          <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-amber-400">
            <Lock className="h-3 w-3" />
          </span>
        )}
      </button>
      {!locked && (
        <button
          type="button"
          onClick={onFavorite}
          aria-label={favorite ? `Remover ${s.label} dos favoritos` : `Favoritar ${s.label}`}
          aria-pressed={favorite}
          className={clsx(
            "absolute right-0 top-0 rounded-full p-1 transition",
            favorite ? "text-amber-400" : "text-white/55 opacity-0 hover:text-amber-400 focus-visible:opacity-100 md:group-hover:opacity-100"
          )}
        >
          <Star className={clsx("h-3.5 w-3.5 drop-shadow", favorite && "fill-current")} />
        </button>
      )}
    </div>
  );
}

/** Emojis · Adesivos · GIFs · Favoritos — docked like a keyboard on phones, a popover on desktop. */
export function StickerPanel({
  onEmoji,
  onSticker,
  onGifFile,
  onGifReuse,
  initialTab = "stickers",
  onTabChange,
  onClose,
  className,
}: {
  onEmoji: (emoji: string) => void;
  onSticker: (id: string, info: StickerInfo) => void;
  onGifFile: (file: File) => void;
  onGifReuse: (a: Attachment) => void;
  initialTab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
  onClose?: () => void;
  className?: string;
}) {
  const { supabase, me, toast } = useMessenger();
  const router = useRouter();
  const [tab, setTab] = useState<PanelTab>(initialTab === ("figurinhas" as PanelTab) ? "stickers" : initialTab);
  const [emojiCat, setEmojiCat] = useState<string>("recentes");
  const [section, setSection] = useState<string>("recentes");
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [lib, setLib] = useState<Library | null>(null);
  const [recentEmojiList, setRecentEmojiList] = useState<string[]>([]);
  const [recents, setRecents] = useState<Sticker[] | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Sticker[] | null>(null);
  const [popular, setPopular] = useState<Sticker[] | null>(null);
  const [packStickers, setPackStickers] = useState<Record<string, Sticker[]>>({});
  const [gifs, setGifs] = useState<Attachment[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ packIds: string[]; stickers: Sticker[] } | null>(null);
  const [preview, setPreview] = useState<Sticker | null>(null);
  const [busy, setBusy] = useState(false);
  const gifInput = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => setTab(initialTab === ("figurinhas" as PanelTab) ? "stickers" : initialTab), [initialTab]);

  useEffect(() => {
    const r = recentEmoji();
    setRecentEmojiList(r);
    if (!r.length) setEmojiCat(EMOJI_CATEGORIES[0].id);
    loadPacks(supabase).then(setPacks, () => setPacks([]));
    loadLibrary(supabase, me.id).then(setLib, () => setLib({ owned: new Set(), installed: new Set(), favoritePacks: new Set() }));
    loadFavoriteStickers(supabase).then(
      (ids) => {
        setFavoriteIds(ids);
        loadStickers(supabase, ids).then(setFavorites, () => setFavorites([]));
      },
      () => setFavorites([])
    );
    loadRecentStickers(supabase).then(
      (ids) => loadStickers(supabase, ids).then(setRecents, () => setRecents([])),
      () => setRecents([])
    );
  }, [supabase, me.id]);

  const byId = useMemo(() => new Map((packs ?? []).map((p) => [p.id, p])), [packs]);
  const installed = useMemo(() => (packs ?? []).filter((p) => lib?.installed.has(p.id)), [packs, lib]);

  // Nothing sent yet → open straight on the first installed pack.
  useEffect(() => {
    if (section === "recentes" && recents && recents.length === 0 && installed.length) setSection(installed[0].id);
  }, [recents, installed, section]);

  // Lazy: a pack's stickers load only when its tab is opened.
  useEffect(() => {
    if (tab !== "stickers" || section === "recentes" || section === "populares" || packStickers[section]) return;
    loadPackStickers(supabase, section).then(
      (list) => setPackStickers((m) => ({ ...m, [section]: list })),
      () => setPackStickers((m) => ({ ...m, [section]: [] }))
    );
  }, [tab, section, packStickers, supabase]);

  useEffect(() => {
    if (section === "populares" && popular === null)
      loadPopularStickers(supabase).then(
        (ids) => loadStickers(supabase, ids).then(setPopular),
        () => setPopular([])
      );
  }, [section, popular, supabase]);

  useEffect(() => {
    if (tab !== "gif" || gifs) return;
    supabase
      .from("Message")
      .select("attachments")
      .eq("type", "gif")
      .is("deletedAt", null)
      .order("createdAt", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const seen = new Set<string>();
        const list: Attachment[] = [];
        (data ?? []).forEach((row) => {
          const a = (Array.isArray(row.attachments) ? row.attachments[0] : null) as Attachment | null;
          if (a?.path && !seen.has(a.path)) {
            seen.add(a.path);
            list.push(a);
          }
        });
        setGifs(list);
      });
  }, [tab, gifs, supabase]);

  // Search: by name, keyword, pack, category or creator (server side).
  useEffect(() => {
    const q = query.trim();
    if (!searching || q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      searchStickers(supabase, q).then(setResults, () => setResults({ packIds: [], stickers: [] }));
    }, 250);
    return () => clearTimeout(t);
  }, [query, searching, supabase]);

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [tab, section, query]);

  const locked = (s: Sticker) => {
    const p = byId.get(s.packId);
    return !p || !isOwned(p, lib) || !isAvailable(p);
  };

  function choose(t: PanelTab) {
    setTab(t);
    onTabChange?.(t);
    setSearching(false);
    setQuery("");
  }

  function send(s: Sticker) {
    if (locked(s)) return setPreview(s);
    rememberSticker(s.id);
    setRecents((r) => [s, ...(r ?? []).filter((x) => x.id !== s.id)]);
    setPreview(null);
    onSticker(s.id, stickerInfo(s));
  }

  async function favorite(s: Sticker) {
    try {
      const next = await toggleFavoriteSticker(supabase, s.id, favoriteIds);
      setFavoriteIds(next);
      setFavorites((f) => (next.includes(s.id) ? [s, ...(f ?? []).filter((x) => x.id !== s.id)] : (f ?? []).filter((x) => x.id !== s.id)));
      toast(next.includes(s.id) ? "Adicionado aos favoritos." : "Removido dos favoritos.");
    } catch {
      toast("Não foi possível favoritar agora.", "error");
    }
  }

  async function addPack(p: Pack) {
    setBusy(true);
    try {
      await setPackInstalled(supabase, p.id, true);
      setLib(await loadLibrary(supabase, me.id));
      toast(`“${p.name}” adicionado aos seus adesivos.`);
    } catch {
      toast("Não foi possível adicionar o pack agora.", "error");
    } finally {
      setBusy(false);
    }
  }

  const openStore = (packId?: string) => router.push(packId ? `/loja/adesivos/${packId}` : "/loja/adesivos");

  let list: Sticker[] | null = null;
  let title = "";
  let emptyText: React.ReactNode = null;
  let currentPack: Pack | undefined;
  if (searching && query.trim().length >= 2) {
    list = results ? results.stickers : null;
    title = `Resultados para “${query.trim()}”`;
    emptyText = "Nenhum adesivo com esse nome. Tente o nome de um pack, uma categoria ou um criador.";
  } else if (tab === "favoritos") {
    list = favorites;
    title = "Meus favoritos";
    emptyText = "Toque na estrela de um adesivo (ou segure o dedo sobre ele) para guardar aqui.";
  } else if (tab === "stickers") {
    if (section === "recentes") {
      list = recents;
      title = "Usados recentemente";
      emptyText = "Os adesivos que você enviar aparecem aqui, em qualquer aparelho.";
    } else if (section === "populares") {
      list = popular;
      title = "Populares no ÓrbitaX";
      emptyText = "Os adesivos mais enviados da semana aparecem aqui.";
    } else {
      currentPack = byId.get(section);
      list = packStickers[section] ?? null;
      title = currentPack?.name ?? "";
    }
  }

  const previewPack = preview ? byId.get(preview.packId) : undefined;
  const previewLocked = preview ? locked(preview) : false;
  const previewInstalled = previewPack ? !!lib?.installed.has(previewPack.id) : false;

  return (
    <div
      className={clsx(
        "relative flex h-[min(52dvh,430px)] flex-col overflow-hidden border-white/10 bg-space-surface bg-[radial-gradient(120%_60%_at_50%_0%,rgb(var(--app-accent,139_92_246)/0.10),transparent_70%)] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]",
        "rounded-t-[28px] border-t md:h-[440px] md:rounded-3xl md:border md:shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
        className
      )}
      role="dialog"
      aria-label="Emojis, adesivos e GIFs"
      onKeyDown={(e) => e.key === "Escape" && (preview ? setPreview(null) : onClose?.())}
    >
      <button type="button" onClick={onClose} aria-label="Fechar" className="mx-auto mt-2 block h-1.5 w-10 shrink-0 rounded-full bg-white/20 transition hover:bg-white/35 md:hidden" />

      {/* Tabs + search */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-2 md:pt-3">
        {searching ? (
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-chat/40 bg-white/[0.05] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-white/45" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar adesivos"
              aria-label="Procurar adesivos por nome, pack, categoria ou criador"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
            <button type="button" onClick={() => (setSearching(false), setQuery(""))} aria-label="Fechar busca" className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </label>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => choose(t.id)}
                  className={clsx(
                    "flex min-w-0 flex-auto items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1.5 py-1.5 text-[12px] font-semibold transition sm:text-[12.5px]",
                    tab === t.id ? "bg-orbit-gradient text-snow shadow-[0_0_16px_rgb(var(--app-accent,139_92_246)/0.4)]" : "text-white/60 hover:text-white"
                  )}
                >
                  {t.icon && (
                    <span aria-hidden className="hidden text-[13px] leading-none min-[380px]:inline">
                      {t.icon}
                    </span>
                  )}
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setSearching(true);
                if (tab === "emoji" || tab === "gif") setTab("stickers");
              }}
              aria-label="Procurar adesivos"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/70 transition hover:border-chat/40 hover:text-white"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      {/* Installed packs row */}
      {!searching && tab === "stickers" && (
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-2 pb-2 [scrollbar-width:none]">
          {[
            { id: "recentes", label: "Recentes", Icon: Clock },
            { id: "populares", label: "Populares", Icon: Flame },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-pressed={section === id}
              title={label}
              aria-label={label}
              className={clsx(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition",
                section === id ? "border-chat/60 bg-chat/15 text-chat" : "border-transparent text-white/55 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          ))}
          <span aria-hidden className="my-2 w-px shrink-0 bg-white/10" />
          {packs === null || lib === null
            ? Array.from({ length: 5 }, (_, i) => <span key={i} className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-white/[0.05]" />)
            : installed.map((p) => {
                const on = section === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSection(p.id)}
                    aria-pressed={on}
                    title={p.name}
                    aria-label={p.name}
                    className={clsx(
                      "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition",
                      on ? "border-chat/60 bg-chat/15" : "border-transparent opacity-75 hover:opacity-100"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.coverUrl} alt="" loading="lazy" className="h-9 w-9 rounded-lg object-contain" />
                    {p.rating === "adulto" && <AdultTag className="absolute -bottom-1 -right-1" />}
                  </button>
                );
              })}
          <button
            type="button"
            onClick={() => openStore()}
            aria-label="Loja de adesivos"
            title="Loja de adesivos"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 text-white/55 transition hover:border-chat/50 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      {!searching && tab === "emoji" && (
        <div className="flex gap-0.5 overflow-x-auto border-b border-white/[0.06] px-2 pb-1.5 [scrollbar-width:none]">
          {recentEmojiList.length > 0 && (
            <button
              type="button"
              onClick={() => setEmojiCat("recentes")}
              aria-label="Recentes"
              className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition", emojiCat === "recentes" ? "bg-chat/15 text-chat" : "text-white/55 hover:text-white")}
            >
              <Clock className="h-4 w-4" />
            </button>
          )}
          {EMOJI_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setEmojiCat(c.id)}
              aria-label={c.label}
              title={c.label}
              className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg transition", emojiCat === c.id ? "bg-chat/15" : "opacity-60 hover:opacity-100")}
            >
              {c.icon}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div ref={body} className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {tab === "emoji" && !searching && (
          <div className="grid grid-cols-8 gap-0.5">
            {(emojiCat === "recentes" ? recentEmojiList : EMOJI_CATEGORIES.find((c) => c.id === emojiCat)?.emoji ?? []).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  rememberEmoji(e);
                  onEmoji(e);
                }}
                className="flex aspect-square items-center justify-center rounded-lg text-[26px] leading-none transition hover:scale-110 hover:bg-white/[0.06] active:scale-90"
                aria-label={e}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {tab === "gif" && !searching && (
          <div className="px-1">
            <input
              ref={gifInput}
              type="file"
              accept="image/gif"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onGifFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => gifInput.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-3 text-sm font-medium text-white/80 transition hover:border-chat/60 hover:bg-chat/10"
            >
              <ImagePlus className="h-4 w-4" /> Enviar GIF do aparelho
            </button>
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">GIFs das suas conversas</p>
            {gifs === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : gifs.length === 0 ? (
              <Empty>Os GIFs enviados e recebidos aparecem aqui para reenviar.</Empty>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {gifs.map((a) => (
                  <GifThumb key={a.path} a={a} onPick={() => onGifReuse(a)} />
                ))}
              </div>
            )}
          </div>
        )}

        {(tab === "stickers" || tab === "favoritos" || searching) && (
          <>
            {searching && results && results.packIds.length > 0 && (
              <div className="mb-2 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
                {results.packIds
                  .map((id) => byId.get(id))
                  .filter((p): p is Pack => !!p)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openStore(p.id)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-medium text-white/80 transition hover:border-chat/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.coverUrl} alt="" className="h-6 w-6 rounded-full object-contain" />
                      {p.name}
                    </button>
                  ))}
              </div>
            )}
            {title && (
              <div className="mb-1.5 flex items-center justify-between gap-2 px-1.5">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-semibold text-white/85">
                  {title}
                  {currentPack?.rating === "adulto" && <AdultTag />}
                </span>
                {currentPack && (
                  <button type="button" onClick={() => openStore(currentPack!.id)} className="shrink-0 text-[11px] font-medium text-white/45 transition hover:text-white">
                    {currentPack.creator}
                  </button>
                )}
              </div>
            )}
            {list === null ? (
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 15 }, (_, i) => (
                  <span key={i} className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <Empty>{emptyText ?? "Nada por aqui ainda."}</Empty>
            ) : (
              <div className={clsx("grid gap-1", currentPack && list[0]?.size !== "mini" ? "grid-cols-4" : "grid-cols-5")}>
                {list.map((s) => (
                  <StickerCell
                    key={s.id}
                    s={s}
                    locked={locked(s)}
                    favorite={favoriteIds.includes(s.id)}
                    onSend={() => send(s)}
                    onFavorite={() => favorite(s)}
                    onPreview={() => setPreview(s)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Big preview: long press (phones) or right click */}
      {preview && (
        <div className="animate-pop-in absolute inset-0 z-10 flex items-center justify-center bg-space-surface/85 p-5 backdrop-blur-md" onClick={() => setPreview(null)}>
          <div className="w-full max-w-[280px] rounded-3xl border border-white/10 bg-space-surface p-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewLocked ? stickerPreviewUrl(preview) : stickerFileUrl(preview)} alt="" className="mx-auto h-36 w-36 object-contain" />
            <p className="mt-2 truncate text-sm font-semibold text-white">{preview.label || "Adesivo"}</p>
            <button type="button" onClick={() => previewPack && openStore(previewPack.id)} className="text-[11px] text-white/45 transition hover:text-white">
              {previewPack?.name} · {previewPack?.creator}
            </button>
            {previewLocked && previewPack && (
              <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-white/60">
                {previewPack.stickers.length} adesivos ·{" "}
                <span className="flex items-center gap-1 font-semibold text-amber-500">
                  <CoinIcon className="h-3.5 w-3.5" /> {formatCoins(previewPack.priceCoins ?? 0)}
                </span>
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {previewLocked ? (
                <button type="button" onClick={() => previewPack && openStore(previewPack.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-orbit-gradient py-2 text-xs font-semibold text-snow">
                  <ShoppingBag className="h-3.5 w-3.5" /> {previewPack?.tier === "premium" ? "Comprar pack" : "Ver na loja"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => favorite(preview)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 py-2 text-xs font-semibold text-white/85 transition hover:border-amber-400/50"
                  >
                    <Star className={clsx("h-3.5 w-3.5", favoriteIds.includes(preview.id) && "fill-amber-400 text-amber-400")} />
                    {favoriteIds.includes(preview.id) ? "Favorito" : "Favoritar"}
                  </button>
                  <button type="button" onClick={() => send(preview)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-orbit-gradient py-2 text-xs font-semibold text-snow">
                    <Send className="h-3.5 w-3.5" /> Enviar
                  </button>
                </>
              )}
            </div>
            {!previewLocked && previewPack && !previewInstalled && (
              <button
                type="button"
                onClick={() => addPack(previewPack)}
                disabled={busy}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-chat/40 py-2 text-xs font-semibold text-white/85 transition hover:bg-chat/10 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Adicionar pack
              </button>
            )}
            {!previewLocked && previewInstalled && tab !== "stickers" && (
              <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-white/40">
                <Check className="h-3 w-3" /> Pack nos seus adesivos
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
