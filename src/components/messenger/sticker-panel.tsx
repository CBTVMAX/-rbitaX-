"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Clock, Coins, ImagePlus, Loader2, Lock, Smile, Star, Sticker } from "lucide-react";
import { EMOJI_CATEGORIES, recentEmoji, rememberEmoji } from "@/lib/messenger/emoji";
import {
  canSend,
  favoriteStickers,
  loadStickerPacks,
  recentStickers,
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

function AdultTag({ className }: { className?: string }) {
  return (
    <span className={clsx("rounded-md bg-orbit-pink/90 px-1 text-[9px] font-bold leading-4 text-snow", className)} aria-label="Conteúdo +18">
      +18
    </span>
  );
}

/** Emoji · Figurinhas (recentes, favoritas, pacotes grátis e premium) · GIF. */
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
  const { supabase, me } = useMessenger();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [emojiCat, setEmojiCat] = useState<string>("recentes");
  const [pack, setPack] = useState<string>("recentes");
  const [packs, setPacks] = useState<StickerPack[] | null>(null);
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
    setRecentSt(recentStickers());
    setFavorites(favoriteStickers());
    loadStickerPacks(supabase, me.id).then(setPacks);
  }, [supabase, me.id]);

  const byId = useMemo(() => new Map((packs ?? []).map((p) => [p.id, p])), [packs]);
  const usable = (id: string) => canSend(byId.get(id.split("/")[0])) && byId.get(id.split("/")[0])!.stickers.includes(id.split("/")[1]);
  const recentUsable = recentSt.filter(usable);
  const favoriteUsable = favorites.filter(usable);

  useEffect(() => {
    if (packs && pack === "recentes" && recentUsable.length === 0) setPack(packs[0]?.id ?? "recentes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packs]);

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

  const emojiList = emojiCat === "recentes" ? recents : EMOJI_CATEGORIES.find((c) => c.id === emojiCat)?.emoji ?? [];
  const current = byId.get(pack);
  const stickerList =
    pack === "recentes"
      ? recentUsable
      : pack === "favoritas"
        ? favoriteUsable
        : (current?.stickers ?? []).map((s) => `${pack}/${s}`);
  const locked = !!current && !canSend(current);
  const premium = (packs ?? []).filter((p) => p.tier === "premium");

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

  const catBtn = (active: boolean, onClick: () => void, content: React.ReactNode, label: string, badge?: React.ReactNode) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition",
        active ? "bg-white/[0.1]" : "opacity-60 hover:opacity-100"
      )}
    >
      {content}
      {badge}
    </button>
  );

  return (
    <div className={clsx("flex h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-space-surface shadow-[0_18px_50px_rgba(0,0,0,0.45)]", className)}>
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
            {(packs ?? []).map((p) =>
              catBtn(
                pack === p.id,
                () => setPack(p.id),
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stickerPreviewSrc(`${p.id}/${p.cover}`)} alt="" className="h-8 w-8 rounded-md object-contain" />,
                `${p.name}${p.tier === "premium" ? " (premium)" : ""}`,
                !canSend(p) ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[#1b1203]">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                ) : undefined
              )
            )}
            {catBtn(pack === "loja", () => setPack("loja"), <Coins className="h-4 w-4 text-amber-300" />, "Loja")}
          </div>

          <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
            {packs === null ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : pack === "loja" ? (
              <div className="space-y-2 p-1">
                <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-3.5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Coins className="h-4 w-4 text-amber-300" /> Loja de figurinhas em breve
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Os pacotes premium serão liberados com Órbita Coins. Por enquanto, todos os pacotes grátis já estão disponíveis.
                  </p>
                </div>
                {premium.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPack(p.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] p-2.5 text-left transition hover:bg-white/[0.04]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stickerPreviewSrc(`${p.id}/${p.cover}`)} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        {p.name} {p.isAdult && <AdultTag />}
                      </span>
                      <span className="text-xs text-white/50">{p.stickers.length} figurinhas · Premium</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-amber-400/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                      {canSend(p) ? "Seu" : "Em breve"}
                    </span>
                  </button>
                ))}
              </div>
            ) : stickerList.length === 0 ? (
              <p className="px-6 py-12 text-center text-xs text-white/45">
                {pack === "favoritas" ? "Toque na estrela de uma figurinha para guardá-la aqui." : "As figurinhas que você enviar aparecem aqui."}
              </p>
            ) : (
              <>
                {current && (
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
                      {current.name}
                      {current.isAdult && <AdultTag />}
                    </span>
                    <span className={clsx("text-[11px]", current.tier === "premium" ? "text-amber-300" : "text-emerald-400")}>
                      {current.tier === "premium" ? (canSend(current) ? "Premium · Seu" : "Premium") : "Grátis"}
                    </span>
                  </div>
                )}
                {locked && (
                  <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2.5">
                    <Lock className="h-4 w-4 shrink-0 text-amber-300" />
                    <p className="text-xs text-white/70">
                      Pacote premium. Vai ficar disponível na loja de Órbita Coins, em breve. Por enquanto você pode ver as figurinhas.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-1.5">
                  {stickerList.map((id) => {
                    const [pid, name] = id.split("/");
                    const p = byId.get(pid);
                    const label = stickerLabel(p, name);
                    const fav = favorites.includes(id);
                    return (
                      <div key={id} className="group relative">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            rememberSticker(id);
                            setRecentSt(recentStickers());
                            onSticker(id);
                          }}
                          className={clsx(
                            "flex aspect-square w-full items-center justify-center rounded-2xl transition",
                            locked ? "cursor-not-allowed" : "hover:bg-white/[0.06] active:scale-95"
                          )}
                          aria-label={locked ? `${label} (bloqueada)` : `Enviar figurinha ${label}`}
                          title={label}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={stickerPreviewSrc(id)}
                            alt=""
                            loading="lazy"
                            className={clsx("h-[84%] w-[84%] object-contain", locked && "opacity-60 saturate-[0.8]")}
                            onMouseEnter={(e) => pid === "orbita" || pid === "reacoes" ? (e.currentTarget.src = stickerSrc(id)) : undefined}
                            onMouseLeave={(e) => (e.currentTarget.src = stickerPreviewSrc(id))}
                          />
                          {locked && (
                            <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-amber-300">
                              <Lock className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                        {!locked && (
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
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
