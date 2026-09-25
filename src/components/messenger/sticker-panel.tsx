"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Clock, Coins, ImagePlus, Loader2, Smile, Star, Sticker } from "lucide-react";
import { EMOJI_CATEGORIES, recentEmoji, rememberEmoji } from "@/lib/messenger/emoji";
import {
  STICKER_PACKS,
  favoriteStickers,
  recentStickers,
  rememberSticker,
  stickerPreviewSrc,
  stickerSrc,
  toggleFavoriteSticker,
} from "@/lib/messenger/stickers";
import { useSignedUrl } from "@/lib/messenger/media";
import type { Attachment } from "@/lib/messenger/types";
import { useMessenger } from "./context";

type Tab = "emoji" | "stickers" | "gif";

function GifThumb({ a, onPick }: { a: Attachment; onPick: () => void }) {
  const src = useSignedUrl(a.path);
  if (src === "") return null;
  return (
    <button type="button" onClick={onPick} className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.06] transition hover:opacity-90 active:scale-95">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="GIF" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full animate-pulse" />
      )}
    </button>
  );
}

/** Emoji · Figurinhas (recentes, favoritas, pacotes) · GIF. */
export function StickerPanel({
  onEmoji,
  onSticker,
  onGifFile,
  onGifReuse,
  initialTab = "emoji",
  className,
}: {
  onEmoji: (emoji: string) => void;
  onSticker: (id: string) => void;
  onGifFile: (file: File) => void;
  onGifReuse: (a: Attachment) => void;
  initialTab?: Tab;
  className?: string;
}) {
  const { supabase } = useMessenger();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [emojiCat, setEmojiCat] = useState<string>("recentes");
  const [pack, setPack] = useState<string>("recentes");
  const [recents, setRecents] = useState<string[]>([]);
  const [recentSt, setRecentSt] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [gifs, setGifs] = useState<Attachment[] | null>(null);
  const gifInput = useRef<HTMLInputElement>(null);

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    const r = recentEmoji();
    setRecents(r);
    if (!r.length) setEmojiCat(EMOJI_CATEGORIES[0].id);
    const rs = recentStickers();
    setRecentSt(rs);
    setFavorites(favoriteStickers());
    if (!rs.length) setPack(STICKER_PACKS[0].id);
  }, []);

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

  const emojiList =
    emojiCat === "recentes" ? recents : EMOJI_CATEGORIES.find((c) => c.id === emojiCat)?.emoji ?? [];
  const stickerList =
    pack === "recentes"
      ? recentSt
      : pack === "favoritas"
        ? favorites
        : (STICKER_PACKS.find((p) => p.id === pack)?.stickers ?? []).map((s) => `${pack}/${s}`);

  const tabBtn = (id: Tab, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={clsx(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold transition",
        tab === id ? "bg-chat/15 text-chat" : "text-white/55 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  const catBtn = (active: boolean, onClick: () => void, content: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg transition",
        active ? "bg-white/[0.1]" : "opacity-60 hover:opacity-100"
      )}
    >
      {content}
    </button>
  );

  return (
    <div className={clsx("flex h-[340px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-space-surface shadow-[0_18px_50px_rgba(0,0,0,0.45)]", className)}>
      <div className="flex gap-1 border-b border-white/10 p-1.5" role="tablist">
        {tabBtn("emoji", "Emoji", Smile)}
        {tabBtn("stickers", "Figurinhas", Sticker)}
        {tabBtn("gif", "GIF", ImagePlus)}
      </div>

      {tab === "emoji" && (
        <>
          <div className="flex gap-0.5 overflow-x-auto border-b border-white/[0.06] px-2 py-1.5 [scrollbar-width:none]">
            {recents.length > 0 &&
              catBtn(emojiCat === "recentes", () => setEmojiCat("recentes"), <Clock className="h-4 w-4 text-white/70" />, "Recentes")}
            {EMOJI_CATEGORIES.map((c) => catBtn(emojiCat === c.id, () => setEmojiCat(c.id), c.icon, c.label))}
          </div>
          <div className="orbit-scrollbar grid min-h-0 flex-1 auto-rows-min grid-cols-8 gap-0.5 overflow-y-auto p-2">
            {emojiList.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  rememberEmoji(e);
                  onEmoji(e);
                }}
                className="flex aspect-square items-center justify-center rounded-lg text-[26px] leading-none transition hover:scale-110 hover:bg-white/[0.06] active:scale-95"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "stickers" && (
        <>
          <div className="flex gap-0.5 overflow-x-auto border-b border-white/[0.06] px-2 py-1.5 [scrollbar-width:none]">
            {catBtn(pack === "recentes", () => setPack("recentes"), <Clock className="h-4 w-4 text-white/70" />, "Recentes")}
            {catBtn(pack === "favoritas", () => setPack("favoritas"), <Star className="h-4 w-4 text-amber-300" />, "Favoritas")}
            {STICKER_PACKS.map((p) =>
              catBtn(
                pack === p.id,
                () => setPack(p.id),
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stickerPreviewSrc(`${p.id}/${p.cover}`)} alt="" className="h-7 w-7" />,
                p.label
              )
            )}
            {catBtn(pack === "loja", () => setPack("loja"), <Coins className="h-4 w-4 text-amber-300" />, "Loja")}
          </div>
          <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
            {pack === "loja" ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-snow shadow-lg">
                  <Coins className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-white">Loja de figurinhas em breve</p>
                <p className="mt-1 text-xs text-white/50">
                  Pacotes premium e exclusivos com Coins estão chegando. Por enquanto, os pacotes Órbita e Reações são grátis.
                </p>
              </div>
            ) : stickerList.length === 0 ? (
              <p className="px-6 py-12 text-center text-xs text-white/45">
                {pack === "favoritas"
                  ? "Toque na estrela de uma figurinha para guardá-la aqui."
                  : "As figurinhas que você enviar aparecem aqui."}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {stickerList.map((id) => {
                  const fav = favorites.includes(id);
                  return (
                    <div key={id} className="group relative">
                      <button
                        type="button"
                        onClick={() => {
                          rememberSticker(id);
                          onSticker(id);
                        }}
                        className="flex aspect-square w-full items-center justify-center rounded-2xl transition hover:bg-white/[0.06] active:scale-95"
                        aria-label={`Enviar figurinha ${id.split("/")[1]}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={stickerPreviewSrc(id)}
                          alt=""
                          loading="lazy"
                          className="h-[78%] w-[78%] object-contain"
                          onMouseEnter={(e) => (e.currentTarget.src = stickerSrc(id))}
                          onMouseLeave={(e) => (e.currentTarget.src = stickerPreviewSrc(id))}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFavorites(toggleFavoriteSticker(id))}
                        aria-label={fav ? "Remover das favoritas" : "Favoritar figurinha"}
                        className={clsx(
                          "absolute right-0.5 top-0.5 rounded-full p-1 transition",
                          fav ? "text-amber-300" : "text-white/40 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        )}
                      >
                        <Star className={clsx("h-3.5 w-3.5", fav && "fill-current")} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "gif" && (
        <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
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
            <p className="py-4 text-center text-xs text-white/45">Os GIFs enviados e recebidos aparecem aqui para reenviar.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {gifs.map((a) => (
                <GifThumb key={a.path} a={a} onPick={() => onGifReuse(a)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
