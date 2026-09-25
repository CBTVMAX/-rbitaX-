"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Clock, Flame, ImagePlus, Loader2, Lock, Play, Plus, Search, Send, Star, X } from "lucide-react";
import { EMOJI_CATEGORIES, recentEmoji, rememberEmoji } from "@/lib/messenger/emoji";
import {
  canSend,
  loadFavoriteStickers,
  loadPopularStickers,
  loadRecentStickers,
  loadStickerPacks,
  rememberSticker,
  stickerLabel,
  stickerPreviewSrc,
  stickerSrc,
  toggleFavoriteSticker,
  type StickerPack,
} from "@/lib/messenger/stickers";
import { useSignedUrl } from "@/lib/messenger/media";
import type { Attachment } from "@/lib/messenger/types";
import { useMessenger } from "./context";

export type PanelTab = "stickers" | "emoji" | "gif" | "figurinhas";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "stickers", label: "Stickers" },
  { id: "emoji", label: "Emoji" },
  { id: "gif", label: "GIF" },
  { id: "figurinhas", label: "Figurinhas" },
];

/** Stickers tab: a short, swipeable row — the rest lives in the store. */
const CATEGORIES: { id: string; label: string; pack?: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { id: "recentes", label: "Recentes", icon: Clock },
  { id: "favoritos", label: "Favoritos", icon: Star },
  { id: "orbita", label: "Órbita X", pack: "orbita" },
  { id: "populares", label: "Populares", icon: Flame },
  { id: "animais", label: "Animais", pack: "animais" },
  { id: "reacoes", label: "Reações", pack: "reacoes" },
  { id: "games", label: "Games", pack: "games" },
];

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

/** One sticker cell: tap sends, star favorites, long press / right click shows a big preview. */
function StickerCell({
  id,
  pack,
  favorite,
  onSend,
  onFavorite,
  onPreview,
}: {
  id: string;
  pack: StickerPack | undefined;
  favorite: boolean;
  onSend: () => void;
  onFavorite: () => void;
  onPreview: () => void;
}) {
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const locked = !canSend(pack);
  const label = stickerLabel(pack, id.split("/")[1]);
  const animated = !!pack?.animated;

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
          locked ? "cursor-not-allowed" : "hover:bg-white/[0.06] active:scale-90"
        )}
        aria-label={locked ? `${label} (bloqueada)` : `Enviar ${label}`}
        title={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stickerPreviewSrc(id)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={clsx("pointer-events-none h-[82%] w-[82%] object-contain", locked && "opacity-60 saturate-[0.8]")}
          onMouseEnter={(e) => animated && (e.currentTarget.src = stickerSrc(id))}
          onMouseLeave={(e) => animated && (e.currentTarget.src = stickerPreviewSrc(id))}
        />
        {animated && !locked && (
          <span aria-hidden className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur group-hover:opacity-0">
            <Play className="ml-px h-2 w-2 fill-current" />
          </span>
        )}
        {locked && (
          <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-amber-300">
            <Lock className="h-3 w-3" />
          </span>
        )}
      </button>
      {!locked && (
        <button
          type="button"
          onClick={onFavorite}
          aria-label={favorite ? `Remover ${label} dos favoritos` : `Favoritar ${label}`}
          aria-pressed={favorite}
          className={clsx(
            "absolute right-0 top-0 rounded-full p-1 transition",
            favorite ? "text-amber-300" : "text-white/55 opacity-0 hover:text-amber-200 focus-visible:opacity-100 md:group-hover:opacity-100"
          )}
        >
          <Star className={clsx("h-3.5 w-3.5 drop-shadow", favorite && "fill-current")} />
        </button>
      )}
    </div>
  );
}

/** Stickers · Emoji · GIF · Figurinhas — docked like a keyboard on phones, a popover on desktop. */
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
  onSticker: (id: string) => void;
  onGifFile: (file: File) => void;
  onGifReuse: (a: Attachment) => void;
  initialTab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
  onClose?: () => void;
  className?: string;
}) {
  const { supabase, me, toast } = useMessenger();
  const router = useRouter();
  const [tab, setTab] = useState<PanelTab>(initialTab);
  const [emojiCat, setEmojiCat] = useState<string>("recentes");
  const [category, setCategory] = useState("recentes");
  const [packId, setPackId] = useState<string | null>(null);
  const [packs, setPacks] = useState<StickerPack[] | null>(null);
  const [recentEmojiList, setRecentEmojiList] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[] | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[] | null>(null);
  const [gifs, setGifs] = useState<Attachment[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const gifInput = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    const r = recentEmoji();
    setRecentEmojiList(r);
    if (!r.length) setEmojiCat(EMOJI_CATEGORIES[0].id);
    loadStickerPacks(supabase, me.id).then(setPacks, () => setPacks([]));
    loadFavoriteStickers(supabase).then(setFavorites, () => {});
    loadRecentStickers(supabase).then(
      (list) => {
        setRecents(list);
        if (!list.length) setCategory((c) => (c === "recentes" ? "orbita" : c));
      },
      () => setRecents([])
    );
  }, [supabase, me.id]);

  useEffect(() => {
    if (category === "populares" && popular === null) loadPopularStickers(supabase).then(setPopular, () => setPopular([]));
  }, [category, popular, supabase]);

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

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [tab, category, packId, query]);

  const byId = useMemo(() => new Map((packs ?? []).map((p) => [p.id, p])), [packs]);
  const figurinhaPacks = useMemo(() => (packs ?? []).filter((p) => p.section === "figurinhas"), [packs]);
  const exists = (id: string) => {
    const [pid, name] = id.split("/");
    return !!byId.get(pid)?.stickers.includes(name);
  };
  const currentPack = byId.get(packId ?? figurinhaPacks[0]?.id ?? "");

  function choose(t: PanelTab) {
    setTab(t);
    onTabChange?.(t);
    setSearching(false);
    setQuery("");
  }

  function send(id: string) {
    rememberSticker(id);
    setRecents((r) => [id, ...(r ?? []).filter((s) => s !== id)]);
    setPreview(null);
    onSticker(id);
  }

  async function favorite(id: string) {
    try {
      const next = await toggleFavoriteSticker(supabase, id, favorites);
      setFavorites(next);
      toast(next.includes(id) ? "Adicionado aos favoritos." : "Removido dos favoritos.");
    } catch {
      toast("Não foi possível favoritar agora.", "error");
    }
  }

  const openStore = () => router.push("/loja?categoria=adesivos");

  let list: string[] | null = null;
  let title = "";
  let emptyText: React.ReactNode = null;
  if (tab === "stickers" || tab === "figurinhas") {
    if (searching && query.trim()) {
      const q = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      list = (packs ?? []).flatMap((p) =>
        p.stickers.map((s) => `${p.id}/${s}`).filter((id) => norm(stickerLabel(p, id.split("/")[1])).includes(q) || norm(p.name).includes(q))
      );
      title = `Resultados para “${query.trim()}”`;
      emptyText = "Nenhum sticker com esse nome.";
    } else if (tab === "figurinhas") {
      list = currentPack ? currentPack.stickers.map((s) => `${currentPack.id}/${s}`) : packs ? [] : null;
      title = currentPack?.name ?? "";
    } else if (category === "recentes") {
      list = recents === null ? null : recents.filter(exists);
      title = "Recentes";
      emptyText = "Os stickers que você enviar aparecem aqui, em qualquer aparelho.";
    } else if (category === "favoritos") {
      list = packs ? favorites.filter(exists) : null;
      title = "Favoritos";
      emptyText = "Toque na estrela de um sticker (ou segure o dedo sobre ele) para guardar aqui.";
    } else if (category === "populares") {
      list = popular === null || !packs ? null : popular.filter(exists);
      title = "Populares no ÓrbitaX";
      emptyText = "Os stickers mais enviados da semana aparecem aqui.";
    } else {
      const c = CATEGORIES.find((x) => x.id === category);
      const p = c?.pack ? byId.get(c.pack) : undefined;
      list = packs ? (p ? p.stickers.map((s) => `${p.id}/${s}`) : []) : null;
      title = c?.label ?? "";
    }
  }

  const grid = (ids: string[], cols: string) => (
    <div className={clsx("grid gap-1", cols)}>
      {ids.map((id) => (
        <StickerCell
          key={id}
          id={id}
          pack={byId.get(id.split("/")[0])}
          favorite={favorites.includes(id)}
          onSend={() => send(id)}
          onFavorite={() => favorite(id)}
          onPreview={() => setPreview(id)}
        />
      ))}
    </div>
  );

  const previewPack = preview ? byId.get(preview.split("/")[0]) : undefined;
  const previewLocked = !canSend(previewPack);

  return (
    <div
      className={clsx(
        "relative flex h-[min(52dvh,430px)] flex-col overflow-hidden border-white/10 bg-space-surface bg-[radial-gradient(120%_60%_at_50%_0%,rgb(var(--app-accent,139_92_246)/0.10),transparent_70%)] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]",
        "rounded-t-[28px] border-t md:h-[440px] md:rounded-3xl md:border md:shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
        className
      )}
      role="dialog"
      aria-label="Stickers, emoji e GIF"
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
              onChange={(e) => {
                setQuery(e.target.value);
                if (tab !== "stickers" && tab !== "figurinhas") setTab("stickers");
              }}
              placeholder="Buscar stickers e figurinhas"
              aria-label="Buscar stickers e figurinhas"
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
                    "min-w-0 flex-auto whitespace-nowrap rounded-xl px-2 py-1.5 text-[12.5px] font-semibold transition sm:text-[13px]",
                    tab === t.id ? "bg-orbit-gradient text-snow shadow-[0_0_16px_rgb(var(--app-accent,139_92_246)/0.4)]" : "text-white/60 hover:text-white"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setSearching(true);
                if (tab === "emoji" || tab === "gif") choose("stickers");
              }}
              aria-label="Buscar stickers"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/70 transition hover:border-chat/40 hover:text-white"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      {/* Category / pack row */}
      {!searching && tab === "stickers" && (
        <div className="flex gap-0.5 overflow-x-auto border-b border-white/[0.06] px-2 pb-1.5 [scrollbar-width:none]">
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            const Icon = c.icon;
            const cover = c.pack ? byId.get(c.pack) : undefined;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={on}
                className={clsx(
                  "relative flex w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 pb-1.5 pt-1 text-[10.5px] font-medium transition",
                  on ? "text-chat" : "text-white/55 hover:text-white"
                )}
              >
                <span className={clsx("flex h-8 w-8 items-center justify-center rounded-xl transition", on && "bg-chat/15")}>
                  {Icon ? (
                    <Icon className={clsx("h-[18px] w-[18px]", c.id === "favoritos" && on && "fill-current")} />
                  ) : cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stickerPreviewSrc(`${cover.id}/${cover.cover}`)} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <span className="h-6 w-6 rounded-lg bg-white/10" />
                  )}
                </span>
                <span className="max-w-full truncate">{c.label}</span>
                {on && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-chat" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={openStore}
            className="flex w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 pb-1.5 pt-1 text-[10.5px] font-medium text-white/55 transition hover:text-white"
            aria-label="Mais stickers na Órbita X Store"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-dashed border-white/20">
              <Plus className="h-4 w-4" />
            </span>
            Loja
          </button>
        </div>
      )}
      {!searching && tab === "figurinhas" && (
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-2 pb-2 [scrollbar-width:none]">
          {figurinhaPacks.map((p) => {
            const on = (currentPack?.id ?? "") === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPackId(p.id)}
                aria-pressed={on}
                title={p.name}
                className={clsx(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition",
                  on ? "border-chat/60 bg-chat/15" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stickerPreviewSrc(`${p.id}/${p.cover}`)} alt={p.name} className="h-9 w-9 rounded-lg object-cover" />
                {p.isAdult && <AdultTag className="absolute -bottom-1 -right-1" />}
                {!canSend(p) && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[#1b1203]">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => router.push("/loja?categoria=adesivos")}
            aria-label="Mais figurinhas na Órbita X Store"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 text-white/55 hover:text-white"
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

        {(tab === "stickers" || tab === "figurinhas" || searching) && (
          <>
            {title && (
              <div className="mb-1.5 flex items-center justify-between gap-2 px-1.5">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-semibold text-white/85">
                  {title}
                  {tab === "figurinhas" && !searching && currentPack?.isAdult && <AdultTag />}
                </span>
                {tab === "figurinhas" && !searching && currentPack && (
                  <span className={clsx("shrink-0 text-[11px]", currentPack.tier === "premium" ? "text-amber-300" : "text-emerald-400")}>
                    {currentPack.tier === "premium" ? (canSend(currentPack) ? "Premium · Seu" : "Premium") : "Grátis"}
                  </span>
                )}
              </div>
            )}
            {list === null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : list.length === 0 ? (
              <Empty>{emptyText ?? "Nada por aqui ainda."}</Empty>
            ) : (
              grid(list, tab === "figurinhas" && !searching ? "grid-cols-4" : "grid-cols-5")
            )}
          </>
        )}
      </div>

      {/* Big preview: long press (phones) or right click */}
      {preview && (
        <div className="animate-pop-in absolute inset-0 z-10 flex items-center justify-center bg-space-surface/80 p-6 backdrop-blur-md" onClick={() => setPreview(null)}>
          <div className="w-full max-w-[260px] rounded-3xl border border-white/10 bg-space-surface p-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stickerSrc(preview)} alt="" className="mx-auto h-36 w-36 object-contain" />
            <p className="mt-2 truncate text-sm font-semibold text-white">{stickerLabel(previewPack, preview.split("/")[1])}</p>
            <p className="text-[11px] text-white/45">
              {previewPack?.name}
              {previewLocked && " · Premium"}
            </p>
            <div className="mt-3 flex gap-2">
              {!previewLocked && (
                <button
                  type="button"
                  onClick={() => favorite(preview)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 py-2 text-xs font-semibold text-white/85 transition hover:border-amber-300/50"
                >
                  <Star className={clsx("h-3.5 w-3.5", favorites.includes(preview) && "fill-amber-300 text-amber-300")} />
                  {favorites.includes(preview) ? "Favorito" : "Favoritar"}
                </button>
              )}
              {previewLocked ? (
                <button type="button" onClick={openStore} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-orbit-gradient py-2 text-xs font-semibold text-snow">
                  Ver na loja
                </button>
              ) : (
                <button type="button" onClick={() => send(preview)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-orbit-gradient py-2 text-xs font-semibold text-snow">
                  <Send className="h-3.5 w-3.5" /> Enviar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
