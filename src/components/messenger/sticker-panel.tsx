"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Check, Clock, Delete, Flame, ImagePlus, Loader2, Lock, Play, Plus, Search, Send, Settings, ShoppingBag, Smile, Sparkles, Star, Store, Trash2, Wand2, X } from "lucide-react";
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
import {
  addPersonalSticker,
  loadPersonalStickers,
  personalStickerFile,
  removePersonalSticker,
  type PersonalSticker,
} from "@/lib/messenger/personal-stickers";
import type { Attachment, StickerInfo } from "@/lib/messenger/types";
import { CoinIcon, formatCoins } from "@/components/coins";
import { useMessenger } from "./context";

export type PanelTab = "emoji" | "stickers" | "gif" | "favoritos";


export function stickerInfo(s: Sticker): StickerInfo {
  return { storage: s.storage, file: s.file, preview: s.preview, format: s.format, w: s.width, h: s.height, size: s.size, label: s.label };
}

function GifThumb({ a, onPick, onMakeSticker }: { a: Attachment; onPick: () => void; onMakeSticker?: (src: string) => void }) {
  const src = useSignedUrl(a.path);
  if (src === "") return null;
  return (
    <div className="group relative aspect-square">
      <button type="button" onClick={onPick} className="relative h-full w-full overflow-hidden rounded-xl bg-white/[0.06] transition hover:opacity-90 active:scale-95" aria-label="Enviar GIF">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full animate-pulse" />
        )}
      </button>
      {src && onMakeSticker && (
        <button
          type="button"
          onClick={() => onMakeSticker(src)}
          aria-label="Transformar em adesivo"
          title="Transformar em adesivo"
          className="absolute bottom-1 right-1 flex h-7 items-center gap-1 rounded-full bg-black/60 px-2 text-[10px] font-semibold text-snow backdrop-blur transition hover:bg-orbit-purple/90 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <Wand2 className="h-3 w-3" /> Adesivo
        </button>
      )}
    </div>
  );
}

/** Um adesivo da própria pessoa: toque envia; lixeira apaga (com confirmação). */
function PersonalCell({ s, onSend, onRemove }: { s: PersonalSticker; onSend: () => void; onRemove: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSend}
        onContextMenu={(e) => (e.preventDefault(), onRemove())}
        className="flex aspect-square w-full select-none items-center justify-center rounded-2xl transition hover:bg-white/[0.06] active:scale-90"
        aria-label="Enviar meu adesivo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.url} alt="" loading="lazy" draggable={false} className="pointer-events-none h-[92%] w-[92%] object-contain" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Apagar adesivo"
        className="absolute right-0 top-0 rounded-full p-1 text-white/55 opacity-100 transition hover:text-red-300 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5 drop-shadow" />
      </button>
    </div>
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
          className={clsx("pointer-events-none h-[92%] w-[92%] object-contain", locked && "opacity-60 saturate-[0.8]")}
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
  tabs,
  onPersonalSticker,
  onOpenStore,
  onBackspace,
}: {
  /** Tecla ⌫ na aba de emojis (apaga o último caractere do campo). */
  onBackspace?: () => void;
  /** Envia um adesivo de "Meus adesivos" (sem isso, a seção não aparece — ex.: comentários). */
  onPersonalSticker?: (file: File) => void;
  /** Abre a loja por cima da conversa; sem isso, vai para a página da loja. */
  onOpenStore?: (packId?: string) => void;
  /** Abas visíveis (ex.: comentários não têm GIF). Padrão: todas. */
  tabs?: PanelTab[];
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
  const [personal, setPersonal] = useState<PersonalSticker[] | null>(null);
  const [draft, setDraft] = useState<{ file: File; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<PersonalSticker | null>(null);
  const gifInput = useRef<HTMLInputElement>(null);
  const stickerInput = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => setTab(initialTab === ("figurinhas" as PanelTab) ? "stickers" : initialTab), [initialTab]);

  useEffect(() => {
    setRecentEmojiList(recentEmoji());
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

  // Nothing sent yet → open straight on the first installed pack (only on the first opening).
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !recents) return;
    if (section === "recentes" && recents.length === 0 && installed.length) {
      jumped.current = true;
      setSection(installed[0].id);
    } else if (recents.length) jumped.current = true;
  }, [recents, installed, section]);

  // Lazy: a pack's stickers load only when its tab is opened.
  useEffect(() => {
    if (tab !== "stickers" || section === "recentes" || section === "populares" || section === "meus" || packStickers[section]) return;
    loadPackStickers(supabase, section).then(
      (list) => setPackStickers((m) => ({ ...m, [section]: list })),
      () => setPackStickers((m) => ({ ...m, [section]: [] }))
    );
  }, [tab, section, packStickers, supabase]);

  useEffect(() => {
    if (!onPersonalSticker || personal !== null || (section !== "meus" && tab !== "gif")) return;
    loadPersonalStickers(supabase, me.id).then(setPersonal, () => setPersonal([]));
  }, [onPersonalSticker, personal, section, tab, supabase, me.id]);

  useEffect(
    () => () => {
      if (draft) URL.revokeObjectURL(draft.url);
    },
    [draft]
  );

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

  const openStore = (packId?: string) => (onOpenStore ? onOpenStore(packId) : router.push(packId ? `/loja/adesivos/${packId}` : "/loja/adesivos"));

  function pickSticker(file: File | undefined) {
    if (!file) return;
    setDraft({ file, url: URL.createObjectURL(file) });
  }

  async function saveDraft(sendToo: boolean) {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const st = await addPersonalSticker(supabase, me.id, draft.file);
      setPersonal((l) => [st, ...(l ?? []).filter((x) => x.path !== st.path)]);
      setDraft(null);
      setTab("stickers");
      setSection("meus");
      if (sendToo && onPersonalSticker) onPersonalSticker(await personalStickerFile(st));
      else toast("Adesivo salvo em Meus adesivos.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar o adesivo.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function gifToSticker(src: string) {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setDraft({ file: new File([blob], "adesivo.gif", { type: blob.type || "image/gif" }), url: URL.createObjectURL(blob) });
    } catch {
      toast("Esse GIF não está mais disponível.", "error");
    }
  }

  async function sendPersonal(st: PersonalSticker) {
    if (!onPersonalSticker) return;
    try {
      onPersonalSticker(await personalStickerFile(st));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível enviar.", "error");
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await removePersonalSticker(supabase, me.id, removing);
      setPersonal((l) => (l ?? []).filter((x) => x.path !== removing.path));
      toast("Adesivo apagado.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível apagar.", "error");
    } finally {
      setRemoving(null);
    }
  }

  let list: Sticker[] | null = null;
  let title = "";
  let emptyText: React.ReactNode = null;
  let currentPack: Pack | undefined;
  if (searching && query.trim().length >= 2) {
    list = results ? results.stickers : null;
    title = `Resultados: ${query.trim()}`;
    emptyText = "Nenhum adesivo com esse nome. Tente o nome de um pack, uma categoria ou um criador.";
  } else if (tab === "favoritos") {
    list = favorites;
    title = "Favoritos";
    emptyText = "Toque na estrela de um adesivo (ou segure o dedo sobre ele) para guardar aqui.";
  } else if (tab === "stickers") {
    if (section === "recentes") {
      list = recents;
      title = "Recentes";
      emptyText = "Os adesivos que você enviar aparecem aqui, em qualquer aparelho.";
    } else if (section === "populares") {
      list = popular;
      title = "Populares";
      emptyText = "Os adesivos mais enviados da semana aparecem aqui.";
    } else if (section === "meus") {
      list = [];
      title = "";
    } else {
      currentPack = byId.get(section);
      list = packStickers[section] ?? null;
      title = currentPack?.name ?? "";
    }
  }

  const previewPack = preview ? byId.get(preview.packId) : undefined;
  const previewLocked = preview ? locked(preview) : false;
  const previewInstalled = previewPack ? !!lib?.installed.has(previewPack.id) : false;

  const show = (t: PanelTab) => !tabs || tabs.includes(t);
  const inSection = (id: string) => !searching && tab === "stickers" && section === id;
  const openSection = (id: string) => {
    choose("stickers");
    setSection(id);
  };
  const barButton = (active: boolean) =>
    clsx(
      "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition md:h-10 md:w-10",
      active ? "bg-white/[0.1] text-chat" : "text-white/50 hover:text-white"
    );
  const heading = "text-[12.5px] font-semibold uppercase tracking-[0.06em] text-white/40";
  const emojiGrid = (list: string[]) => (
    <div className="grid grid-cols-7 sm:grid-cols-8">
      {list.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => {
            rememberEmoji(e);
            onEmoji(e);
          }}
          className="flex aspect-square items-center justify-center rounded-xl text-[31px] leading-none transition hover:bg-white/[0.06] active:scale-90 md:text-[26px]"
          aria-label={e}
        >
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={clsx(
        "relative flex h-[min(46dvh,390px)] flex-col overflow-hidden bg-[rgb(var(--chat-recv))]",
        "md:h-[440px] md:rounded-3xl md:border md:border-white/10 md:shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
        className
      )}
      role="dialog"
      aria-label="Emojis, adesivos e GIFs"
      onKeyDown={(e) => e.key === "Escape" && (draft ? setDraft(null) : removing ? setRemoving(null) : preview ? setPreview(null) : onClose?.())}
    >
      {/* Uma barra só, como no VK: busca · loja · emojis · recentes · favoritos · meus · GIF · populares · packs */}
      <div className="relative shrink-0 border-b border-white/[0.06] bg-[rgb(var(--chat-bar))]">
        {searching ? (
          <div className="px-2.5 py-2">
            <label className="flex min-w-0 items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2">
              <Search className="h-4 w-4 shrink-0 text-white/45" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar adesivos"
                aria-label="Procurar adesivos por nome, pack, categoria ou criador"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40"
              />
              <button type="button" onClick={() => (setSearching(false), setQuery(""))} aria-label="Fechar busca" className="text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </label>
          </div>
        ) : (
          <div
            className={clsx("flex items-center gap-2 overflow-x-auto px-2 py-1.5 md:gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", tab === "emoji" && onBackspace && "pr-16")}
            role="tablist"
          >
            {show("stickers") && (
              <button
                type="button"
                onClick={() => {
                  setSearching(true);
                  if (tab === "emoji" || tab === "gif") setTab("stickers");
                }}
                aria-label="Procurar adesivos"
                title="Procurar"
                className={barButton(false)}
              >
                <Search className="h-[22px] w-[22px]" />
              </button>
            )}
            <button type="button" onClick={() => openStore()} aria-label="Loja de adesivos" title="Loja de adesivos" className={barButton(false)}>
              <Store className="h-[23px] w-[23px]" />
            </button>
            {show("emoji") && (
              <button type="button" role="tab" aria-selected={tab === "emoji"} onClick={() => choose("emoji")} aria-label="Emojis" title="Emojis" className={barButton(tab === "emoji")}>
                <Smile className="h-[23px] w-[23px]" />
              </button>
            )}
            {show("stickers") && (
              <button type="button" role="tab" aria-selected={inSection("recentes")} onClick={() => openSection("recentes")} aria-label="Recentes" title="Recentes" className={barButton(inSection("recentes"))}>
                <Clock className="h-[22px] w-[22px]" />
              </button>
            )}
            {show("favoritos") && (
              <button type="button" role="tab" aria-selected={tab === "favoritos"} onClick={() => choose("favoritos")} aria-label="Favoritos" title="Favoritos" className={barButton(tab === "favoritos" && !searching)}>
                <Star className="h-[22px] w-[22px]" />
              </button>
            )}
            {onPersonalSticker && show("stickers") && (
              <button type="button" role="tab" aria-selected={inSection("meus")} onClick={() => openSection("meus")} aria-label="Meus adesivos" title="Meus adesivos" className={barButton(inSection("meus"))}>
                <Wand2 className="h-[21px] w-[21px]" />
              </button>
            )}
            {show("gif") && (
              <button type="button" role="tab" aria-selected={tab === "gif"} onClick={() => choose("gif")} aria-label="GIFs" title="GIFs" className={barButton(tab === "gif")}>
                <span className="rounded-md border-[1.8px] border-current px-1 text-[10px] font-extrabold leading-[14px] tracking-wide">GIF</span>
              </button>
            )}
            {show("stickers") && (
              <button type="button" role="tab" aria-selected={inSection("populares")} onClick={() => openSection("populares")} aria-label="Populares" title="Populares" className={barButton(inSection("populares"))}>
                <Flame className="h-[22px] w-[22px]" />
              </button>
            )}
            {show("stickers") &&
              (packs === null || lib === null
                ? Array.from({ length: 4 }, (_, i) => <span key={i} className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/[0.06] md:h-10 md:w-10" />)
                : installed.map((p) => {
                    const on = inSection(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => openSection(p.id)}
                        title={p.name}
                        aria-label={p.name}
                        className={clsx(barButton(on), !on && "opacity-90 hover:opacity-100")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.coverUrl} alt="" loading="lazy" className="h-10 w-10 object-contain md:h-8 md:w-8" />
                        {p.rating === "adulto" && <AdultTag className="absolute -bottom-0.5 -right-0.5" />}
                      </button>
                    );
                  }))}
          </div>
        )}
        {!searching && tab === "emoji" && onBackspace && (
          <div className="absolute inset-y-0 right-0 flex items-center bg-[rgb(var(--chat-bar))] pl-1 pr-2 shadow-[-14px_0_12px_-6px_rgb(var(--chat-bar))]">
            <button
              type="button"
              onClick={onBackspace}
              aria-label="Apagar"
              title="Apagar"
              className="flex h-10 w-12 items-center justify-center rounded-xl text-white/65 transition hover:bg-white/[0.06] hover:text-white active:scale-95"
            >
              <Delete className="h-[26px] w-[26px]" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={body} className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {tab === "emoji" && !searching && (
          <>
            {recentEmojiList.length > 0 && (
              <>
                <p className={clsx(heading, "px-2 pb-1.5 pt-3.5")}>Mais usados</p>
                {emojiGrid(recentEmojiList.slice(0, 21))}
              </>
            )}
            {EMOJI_CATEGORIES.map((c) => (
              <div key={c.id}>
                <p className={clsx(heading, "px-2 pb-1.5 pt-4")}>{c.label}</p>
                {emojiGrid(c.emoji)}
              </div>
            ))}
          </>
        )}

        {tab === "gif" && !searching && (
          <div className="px-1 pt-3">
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
            {onPersonalSticker && (
              <button
                type="button"
                onClick={() => stickerInput.current?.click()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-[0_8px_22px_rgb(var(--app-accent,139_92_246)/0.35)] transition hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" /> Transformar GIF em adesivo
              </button>
            )}
            <p className={clsx(heading, "mb-2 mt-4 px-1")}>GIFs das suas conversas</p>
            {gifs === null ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : gifs.length === 0 ? (
              <Empty>Os GIFs enviados e recebidos aparecem aqui para reenviar.</Empty>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {gifs.map((a) => (
                  <GifThumb key={a.path} a={a} onPick={() => onGifReuse(a)} onMakeSticker={onPersonalSticker ? gifToSticker : undefined} />
                ))}
              </div>
            )}
          </div>
        )}

        <input
          ref={stickerInput}
          type="file"
          accept="image/gif,image/png,image/webp,image/jpeg"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            pickSticker(f);
          }}
        />

        {tab === "stickers" && section === "meus" && !searching && (
          <div className="px-0.5">
            <div className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-3.5">
              <span className={heading}>Meus adesivos</span>
              <span className="text-[11px] text-white/35">GIF vira adesivo animado</span>
            </div>
            {personal === null ? (
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-x-1 gap-y-2">
                <button
                  type="button"
                  onClick={() => stickerInput.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 text-white/60 transition hover:border-chat/60 hover:bg-chat/10 hover:text-white"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Criar</span>
                </button>
                {personal.map((st) => (
                  <PersonalCell key={st.path} s={st} onSend={() => sendPersonal(st)} onRemove={() => setRemoving(st)} />
                ))}
              </div>
            )}
            {personal?.length === 0 && (
              <p className="px-6 pb-4 pt-5 text-center text-xs leading-relaxed text-white/45">
                Toque em <strong className="text-white/70">Criar</strong> e escolha um GIF ou uma foto. Ele vira seu adesivo, fica salvo na sua conta e aparece aqui em qualquer aparelho.
                Na aba GIFs, toque em <strong className="text-white/70">Adesivo</strong> num GIF da conversa para transformar.
              </p>
            )}
          </div>
        )}

        {(tab === "stickers" || tab === "favoritos" || searching) && !(tab === "stickers" && section === "meus" && !searching) && (
          <>
            {searching && results && results.packIds.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto px-1 pt-3 [scrollbar-width:none]">
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
              <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-3.5">
                <span className={clsx(heading, "flex min-w-0 items-center gap-2")}>
                  <span className="truncate">{title}</span>
                  {currentPack?.rating === "adulto" && <AdultTag />}
                  {currentPack && (
                    <button
                      type="button"
                      onClick={() => openStore(currentPack!.id)}
                      aria-label={`Sobre o pack ${currentPack.name}`}
                      title="Sobre o pack"
                      className="-my-1 shrink-0 rounded-full p-1 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      <Settings className="h-[18px] w-[18px]" />
                    </button>
                  )}
                </span>
                {currentPack && <span className="shrink-0 truncate text-[11px] text-white/35">{currentPack.creator}</span>}
              </div>
            )}
            {list === null ? (
              <div className="grid grid-cols-4 gap-x-1 gap-y-2 pt-3">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <Empty>{emptyText ?? "Nada por aqui ainda."}</Empty>
            ) : (
              <div className={clsx("grid gap-x-1 gap-y-2", list[0]?.size === "mini" ? "grid-cols-5" : "grid-cols-4")}>
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

      {/* Criar adesivo: prévia do GIF/foto antes de salvar */}
      {draft && (
        <div className="animate-pop-in absolute inset-0 z-20 flex items-center justify-center bg-space-surface/90 p-5 backdrop-blur-md" onClick={() => !saving && setDraft(null)}>
          <div className="w-full max-w-[300px] rounded-3xl border border-white/10 bg-space-surface p-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-white">Novo adesivo</p>
            <span className="mx-auto mt-3 flex h-40 w-40 items-center justify-center rounded-2xl bg-[conic-gradient(rgb(255_255_255/0.06)_25%,transparent_0_50%,rgb(255_255_255/0.06)_0_75%,transparent_0)] bg-[length:16px_16px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.url} alt="" className="max-h-full max-w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.4)]" />
            </span>
            <p className="mt-2 text-[11px] text-white/45">{draft.file.type === "image/gif" ? "Vai continuar animado." : "Vira um adesivo leve, com fundo transparente se a imagem tiver."}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={saving} onClick={() => saveDraft(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/5 disabled:opacity-60">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
              </button>
              <button type="button" disabled={saving} onClick={() => saveDraft(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-orbit-gradient py-2 text-xs font-semibold text-snow disabled:opacity-60">
                <Send className="h-3.5 w-3.5" /> Salvar e enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {removing && (
        <div className="animate-pop-in absolute inset-0 z-20 flex items-center justify-center bg-space-surface/90 p-5 backdrop-blur-md" onClick={() => setRemoving(null)}>
          <div className="w-full max-w-[280px] rounded-3xl border border-white/10 bg-space-surface p-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={removing.url} alt="" className="mx-auto h-24 w-24 object-contain" />
            <p className="mt-2 text-sm font-semibold text-white">Apagar este adesivo?</p>
            <p className="mt-1 text-[11px] text-white/45">Ele sai de Meus adesivos. As mensagens já enviadas continuam.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setRemoving(null)} className="flex-1 rounded-full border border-white/15 py-2 text-xs font-semibold text-white/85 hover:bg-white/5">
                Cancelar
              </button>
              <button type="button" onClick={confirmRemove} className="flex-1 rounded-full bg-red-500 py-2 text-xs font-semibold text-snow hover:bg-red-500/90">
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

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
