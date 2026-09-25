"use client";

import { memo, useRef } from "react";
import { clsx } from "clsx";
import { AlertCircle, Ban, Clock, CornerUpRight, Star, Timer } from "lucide-react";
import { formatTime, isEmojiOnly, messagePreview, URL_PATTERN } from "@/lib/messenger/format";
import type { ChatMessage, Member, PollVote, Reaction } from "@/lib/messenger/types";
import {
  ContactCard,
  FileCard,
  GifView,
  LocationCard,
  MediaGrid,
  MusicCard,
  PollCard,
  StickerView,
  VoicePlayer,
} from "./message-content";
import { DeliveryTicks } from "./conversation-item";
import { HoverActions, type DeliveryState, type MessageAction } from "./message-actions";
import { ChatAvatar } from "./ui";

const NAME_COLORS = ["text-orbit-cyan", "text-pink-400", "text-amber-400", "text-emerald-400", "text-sky-400", "text-violet-400", "text-rose-400"];

export function nameColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const i = match.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(
      <a key={i} href={match[0]} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline decoration-current/40 underline-offset-2 hover:decoration-current">
        {match[0]}
      </a>
    );
    last = i + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Meta({
  m,
  mine,
  state,
  favorite,
  overlay,
}: {
  m: ChatMessage;
  mine: boolean;
  state: DeliveryState;
  favorite: boolean;
  overlay?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex select-none items-center gap-1 whitespace-nowrap text-[11px] leading-none",
        overlay ? "rounded-full bg-black/45 px-2 py-1 text-snow backdrop-blur" : mine ? "text-snow/75" : "text-white/45"
      )}
    >
      {favorite && <Star className="h-3 w-3 fill-current" aria-label="Favorita" />}
      {m.expiresAt && <Timer className="h-3 w-3" aria-label="Temporária" />}
      {formatTime(m.createdAt)}
      {mine && state === "sending" && <Clock className="h-3 w-3" aria-label="Enviando" />}
      {mine && state === "failed" && <AlertCircle className="h-3.5 w-3.5 text-red-300" aria-label="Não enviada" />}
      {mine && (state === "sent" || state === "delivered" || state === "seen") && (
        <DeliveryTicks state={state} className={state === "seen" ? (overlay ? "text-orbit-cyan" : "text-snow") : ""} />
      )}
    </span>
  );
}

export type BubbleProps = {
  m: ChatMessage;
  mine: boolean;
  meId: string;
  group: boolean;
  sender?: Member;
  firstInRun: boolean;
  lastInRun: boolean;
  replyTo?: ChatMessage | null;
  replySenderName?: string;
  reactions: Reaction[];
  votes: PollVote[];
  favorite: boolean;
  state: DeliveryState;
  highlight: boolean;
  onReact: (m: ChatMessage, emoji: string) => void;
  onAction: (m: ChatMessage, a: MessageAction) => void;
  onLongPress: (m: ChatMessage) => void;
  onOpenMedia: (m: ChatMessage, index: number) => void;
  onVote: (m: ChatMessage, indexes: number[]) => void;
  onJump: (id: string) => void;
  onRetry: (m: ChatMessage) => void;
};

export const MessageBubble = memo(function MessageBubble(p: BubbleProps) {
  const { m, mine, group, sender, firstInRun, lastInRun, reactions, favorite, state } = p;
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (m.type === "system") {
    return (
      <div className="my-2 flex justify-center px-6">
        <span className="rounded-full border border-white/10 bg-space-surface/70 px-3.5 py-1.5 text-center text-xs text-white/60 backdrop-blur">
          {m.content}
        </span>
      </div>
    );
  }

  const deleted = !!m.deletedAt;
  const emojiOnly = !deleted && m.type === "text" && isEmojiOnly(m.content);
  const bare = !deleted && (m.type === "sticker" || m.type === "gif" || emojiOnly);
  const media = !deleted && m.type === "media";
  const caption = media && m.content.trim();
  const card = !deleted && ["file", "voice", "music", "location", "contact", "poll"].includes(m.type);
  const myReaction = reactions.find((r) => r.userId === p.meId)?.emoji ?? null;

  const grouped = new Map<string, { count: number; mine: boolean }>();
  reactions.forEach((r) => {
    const g = grouped.get(r.emoji) ?? { count: 0, mine: false };
    g.count++;
    if (r.userId === p.meId) g.mine = true;
    grouped.set(r.emoji, g);
  });

  const startPress = () => {
    if (press.current) clearTimeout(press.current);
    press.current = setTimeout(() => {
      press.current = null;
      navigator.vibrate?.(12);
      p.onLongPress(m);
    }, 420);
  };
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current);
    press.current = null;
  };

  const replyBlock = !deleted && p.replyTo !== undefined && m.replyToId && (
    <button
      type="button"
      onClick={() => m.replyToId && p.onJump(m.replyToId)}
      className={clsx(
        "mb-1.5 block w-full overflow-hidden rounded-xl border-l-[3px] px-2.5 py-1.5 text-left text-xs",
        mine ? "border-snow/80 bg-black/15" : "border-chat bg-white/[0.06]",
        (media || card) && "mx-1.5 mt-1.5 w-[calc(100%-0.75rem)]"
      )}
    >
      <span className={clsx("block truncate font-semibold", mine ? "text-snow" : "text-chat")}>{p.replySenderName ?? "Mensagem"}</span>
      <span className={clsx("line-clamp-2", mine ? "text-snow/80" : "text-white/60")}>
        {p.replyTo
          ? p.replyTo.deletedAt
            ? "Mensagem apagada"
            : messagePreview(p.replyTo.type, p.replyTo.content, p.replyTo.meta, p.replyTo.attachments)
          : "Mensagem indisponível"}
      </span>
    </button>
  );

  const forwarded = m.meta.forwarded && !deleted && (
    <span className={clsx("mb-1 flex items-center gap-1 text-[11px] italic", mine ? "text-snow/75" : "text-white/45", (media || card) && "px-2.5 pt-2")}>
      <CornerUpRight className="h-3 w-3" /> Encaminhada
    </span>
  );

  let body: React.ReactNode;
  if (deleted) {
    body = (
      <span className={clsx("flex items-center gap-1.5 text-sm italic", mine ? "text-snow/80" : "text-white/50")}>
        <Ban className="h-3.5 w-3.5" /> Mensagem apagada
      </span>
    );
  } else if (m.type === "sticker") body = <StickerView id={m.meta.sticker ?? ""} />;
  else if (m.type === "gif") body = <GifView message={m} onOpen={() => p.onOpenMedia(m, 0)} />;
  else if (emojiOnly) body = <span className="text-5xl leading-tight">{m.content.trim()}</span>;
  else if (media) body = <MediaGrid message={m} onOpen={(i) => p.onOpenMedia(m, i)} />;
  else if (m.type === "file") body = <div className="space-y-1">{m.attachments.map((a) => <FileCard key={a.path} a={a} mine={mine} sending={m.status === "sending"} />)}</div>;
  else if (m.type === "voice") body = <VoicePlayer message={m} mine={mine} />;
  else if (m.type === "music") body = <MusicCard message={m} mine={mine} />;
  else if (m.type === "location") body = <LocationCard message={m} mine={mine} />;
  else if (m.type === "contact") body = <ContactCard message={m} mine={mine} />;
  else if (m.type === "poll") body = <PollCard message={m} mine={mine} votes={p.votes} meId={p.meId} onVote={(ix) => p.onVote(m, ix)} />;
  else
    body = (
      <span className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
        <RichText text={m.content} />
      </span>
    );

  const showAvatarColumn = group && !mine;

  return (
    <div
      id={`msg-${m.id}`}
      className={clsx(
        "group/msg flex items-end gap-2 px-3 md:px-6",
        mine ? "justify-end" : "justify-start",
        firstInRun ? "mt-3" : "mt-0.5",
        "animate-msg-in"
      )}
    >
      {showAvatarColumn && (
        <span className="w-8 shrink-0 self-end">
          {lastInRun && sender && <ChatAvatar name={sender.name} url={sender.avatarUrl} size={32} frame={sender.avatarFrame} />}
        </span>
      )}

      <div className={clsx("flex min-w-0 max-w-[82%] flex-col md:max-w-[68%]", mine ? "items-end" : "items-start")}>
        {group && !mine && firstInRun && (
          <span className={clsx("mb-1 ml-3 text-xs font-semibold", nameColor(m.senderId))}>{sender?.name ?? "Ex-membro"}</span>
        )}

        <div
          onContextMenu={(e) => {
            if (window.matchMedia("(pointer: coarse)").matches) {
              e.preventDefault();
              p.onLongPress(m);
            }
          }}
          onTouchStart={startPress}
          onTouchMove={cancelPress}
          onTouchEnd={cancelPress}
          onClick={() => state === "failed" && p.onRetry(m)}
          className={clsx(
            "relative max-w-full select-text",
            p.highlight && "animate-msg-flash rounded-2xl",
            bare
              ? ""
              : clsx(
                  "rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.12)]",
                  mine
                    ? "bg-chat-bubble text-snow"
                    : "border border-white/[0.08] bg-white/[0.07] text-white backdrop-blur-md",
                  lastInRun && (mine ? "rounded-br-md" : "rounded-bl-md"),
                  media || card ? "overflow-hidden" : "px-3.5 py-2",
                  card && !media && "p-2",
                  state === "failed" && "cursor-pointer ring-1 ring-red-400/60"
                )
          )}
        >
          {!bare && forwarded}
          {!bare && replyBlock}
          {bare && !deleted && (m.replyToId || m.meta.forwarded) && (
            <div className={clsx("mb-1 max-w-[240px] rounded-2xl px-3 py-2", mine ? "bg-chat-bubble text-snow" : "border border-white/[0.08] bg-white/[0.07]")}>
              {forwarded}
              {replyBlock}
            </div>
          )}

          {body}

          {caption && (
            <span className="block whitespace-pre-wrap break-words px-3 pb-1 pt-2 text-[15px] leading-relaxed">
              <RichText text={m.content} />
            </span>
          )}

          {emojiOnly || m.type === "sticker" ? (
            <span className={clsx("mt-0.5 flex", mine ? "justify-end" : "justify-start")}>
              <Meta m={m} mine={mine} state={state} favorite={favorite} overlay />
            </span>
          ) : bare || (media && !caption) ? (
            <span className={clsx("absolute bottom-2", mine ? "right-2" : bare ? "left-2" : "right-2")}>
              <Meta m={m} mine={mine} state={state} favorite={favorite} overlay />
            </span>
          ) : (
            <span className={clsx("flex justify-end", media || card ? "px-3 pb-2 pt-0.5" : "-mb-0.5 mt-0.5")}>
              <Meta m={m} mine={mine} state={state} favorite={favorite} />
            </span>
          )}
        </div>

        {state === "failed" && (
          <button type="button" onClick={() => p.onRetry(m)} className="mt-1 text-[11px] font-medium text-red-400 hover:underline">
            Não enviada · Toque para tentar de novo
          </button>
        )}

        {grouped.size > 0 && (
          <div className={clsx("-mt-1.5 flex flex-wrap gap-1", mine ? "mr-2 justify-end" : "ml-2")}>
            {Array.from(grouped.entries()).map(([emoji, g]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => p.onReact(m, emoji)}
                aria-label={`${emoji} ${g.count}`}
                className={clsx(
                  "relative z-[1] flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-sm shadow-sm transition hover:scale-105",
                  g.mine ? "border-chat/60 bg-chat/25" : "border-white/10 bg-space-surface"
                )}
              >
                <span>{emoji}</span>
                {g.count > 1 && <span className="text-[11px] font-semibold text-white/75">{g.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <HoverActions
        m={m}
        mine={mine}
        favorite={favorite}
        myReaction={myReaction}
        onReact={(e) => p.onReact(m, e)}
        onAction={(a) => p.onAction(m, a)}
      />
    </div>
  );
});
