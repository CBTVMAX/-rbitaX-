"use client";

import { memo, useRef } from "react";
import { clsx } from "clsx";
import { AlertCircle, Ban, Bookmark, BookOpen, Clock, CornerUpRight, Star, Timer } from "lucide-react";
import { formatTime, isEmojiOnly, messagePreview, URL_PATTERN } from "@/lib/messenger/format";
import type { ChatMessage, Member, PollVote, Reaction } from "@/lib/messenger/types";
import {
  ContactCard,
  DiceCard,
  FileCard,
  GiftCard,
  GifView,
  LocationCard,
  MediaGrid,
  MusicCard,
  PollCard,
  StickerView,
  VoicePlayer,
} from "./message-content";
import { useChatRules } from "@/lib/messenger/group-rules";
import { DeliveryTicks } from "./conversation-item";
import { HoverActions, type DeliveryState, type MessageAction } from "./message-actions";
import { ChatAvatar } from "./ui";

const NAME_COLORS = ["text-orbit-cyan", "text-pink-400", "text-amber-400", "text-emerald-400", "text-sky-400", "text-violet-400", "text-rose-400"];

export function nameColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

const MENTION_TOKEN = /@[a-zA-Z0-9_.]{2,30}/g;
const MENTION_ALL = new Set(["todos", "todas", "all", "geral", "everyone"]);

/** Destaca @menções e @todos dentro de um trecho de texto puro (fora de URLs). */
function withMentions(str: string, kb: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of str.matchAll(MENTION_TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(str.slice(last, i));
    const isAll = MENTION_ALL.has(m[0].slice(1).toLowerCase());
    out.push(
      <span key={`${kb}-${i}`} className={clsx("font-semibold", isAll ? "rounded bg-chat/25 px-1 text-chat" : "text-chat")}>
        {m[0]}
      </span>
    );
    last = i + m[0].length;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}

function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const i = match.index ?? 0;
    if (i > last) parts.push(...withMentions(text.slice(last, i), `u${i}`));
    parts.push(
      <a key={i} href={match[0]} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline decoration-current/40 underline-offset-2 hover:decoration-current">
        {match[0]}
      </a>
    );
    last = i + match[0].length;
  }
  if (last < text.length) parts.push(...withMentions(text.slice(last), "end"));
  return <>{parts}</>;
}

function Meta({
  m,
  mine,
  state,
  favorite,
  overlay,
  plain,
}: {
  m: ChatMessage;
  mine: boolean;
  state: DeliveryState;
  favorite: boolean;
  overlay?: boolean;
  /** Fora de balão (lista do computador): cores neutras, mas com os tiques de entrega. */
  plain?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex select-none items-center gap-1 whitespace-nowrap text-[11px] leading-none",
        overlay ? "rounded-full bg-black/45 px-2 py-1 text-snow backdrop-blur" : mine && !plain ? "text-snow/75" : "text-white/45"
      )}
    >
      {favorite && <Star className="h-3 w-3 fill-current" aria-label="Favorita" />}
      {m.expiresAt && <Timer className="h-3 w-3" aria-label="Temporária" />}
      {formatTime(m.createdAt)}
      {mine && state === "sending" && <Clock className="h-3 w-3" aria-label="Enviando" />}
      {mine && state === "failed" && <AlertCircle className="h-3.5 w-3.5 text-red-300" aria-label="Não enviada" />}
      {mine && (state === "sent" || state === "delivered" || state === "seen") && (
        <DeliveryTicks state={state} className={state === "seen" ? (overlay || plain ? "text-orbit-cyan" : "text-snow") : ""} />
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
  /** Opens the chat a saved message came from ("Salvo de …"). */
  onOpenOrigin?: (conversationId: string, messageId: string) => void;
  /** The chat is the member's "Salvos": no delivery ticks, copies show where they came from. */
  savedSpace?: boolean;
  /** Computador: mensagens em lista, sem balão (foto, nome e hora), como no VK. */
  flat?: boolean;
};

export const MessageBubble = memo(function MessageBubble(p: BubbleProps) {
  const { m, group, firstInRun, lastInRun, reactions, favorite } = p;
  // In "Salvos", a copy of someone else's message keeps their side and avatar.
  const origin = p.savedSpace ? m.meta.savedFrom : undefined;
  const mine = origin ? origin.senderId === p.meId : p.mine;
  // Cores dos cartões/citações: sem balão colorido (modo lista), tudo usa as cores neutras.
  const look = p.flat ? false : mine;
  const state: DeliveryState = p.savedSpace && (p.state === "sent" || p.state === "delivered" || p.state === "seen") ? "sent" : p.state;
  const sender: Member | undefined = origin && !mine
    ? { id: origin.senderId, name: origin.senderName, username: "", avatarUrl: origin.senderAvatarUrl ?? null, avatarFrame: origin.senderAvatarFrame ?? null, role: "member", lastReadAt: null }
    : p.sender;
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rules = useChatRules();

  if (m.type === "system") {
    // "Mensagens do sistema no chat" desligado nas configurações do grupo: os avisos não aparecem.
    if (!rules.systemMessages) return null;
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
  const card = !deleted && ["file", "voice", "music", "location", "contact", "poll", "gift"].includes(m.type);
  const inlineMeta = !deleted && (m.type === "voice" || m.type === "music");
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

  // Resposta a uma mensagem que foi apagada: a citação some junto (não fica "Mensagem apagada").
  const replyBlock = !deleted && p.replyTo !== undefined && !p.replyTo?.deletedAt && m.replyToId && (
    <button
      type="button"
      onClick={() => m.replyToId && p.onJump(m.replyToId)}
      className={clsx(
        "mb-1.5 block w-full overflow-hidden rounded-xl border-l-[3px] px-2.5 py-1.5 text-left text-xs",
        look ? "border-snow/80 bg-black/15" : "border-chat bg-white/[0.06]",
        (media || card) && "mx-1.5 mt-1.5 w-[calc(100%-0.75rem)]"
      )}
    >
      <span className={clsx("block truncate font-semibold", look ? "text-snow" : "text-chat")}>{p.replySenderName ?? "Mensagem"}</span>
      <span className={clsx("line-clamp-2", look ? "text-snow/80" : "text-white/60")}>
        {p.replyTo ? messagePreview(p.replyTo.type, p.replyTo.content, p.replyTo.meta, p.replyTo.attachments) : "Mensagem indisponível"}
      </span>
    </button>
  );

  const savedHeader = origin && !deleted && (
    <button
      type="button"
      onClick={() => p.onOpenOrigin?.(origin.conversationId, origin.messageId)}
      title={`Abrir em ${origin.chatTitle}`}
      className={clsx(
        "mb-1 flex max-w-full items-center gap-1 text-left text-[11px] font-medium transition hover:underline",
        look ? "text-snow/80" : "text-chat",
        (media || card) && "px-2.5 pt-2"
      )}
    >
      <Bookmark className="h-3 w-3 shrink-0 fill-current" />
      <span className="truncate">
        Salvo de {origin.senderId === p.meId ? "você" : origin.senderName}
        {origin.isGroup || origin.senderId === p.meId ? ` · ${origin.chatTitle}` : ""}
      </span>
    </button>
  );

  const forwarded = m.meta.forwarded && !deleted && (
    <span className={clsx("mb-1 flex items-center gap-1 text-[11px] italic", look ? "text-snow/75" : "text-white/45", (media || card) && "px-2.5 pt-2")}>
      <CornerUpRight className="h-3 w-3" /> Encaminhada
    </span>
  );

  const sr = m.meta.storyReply;
  // Histórias de comunidade abrem de novo pelo link; as do perfil expiram, então o cartão é só contexto.
  const storyInner = sr && (
    <>
      {sr.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sr.thumb} alt="" className="h-9 w-6 shrink-0 rounded object-cover" />
      ) : (
        <BookOpen className="h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0">
        <span className="block font-semibold">
          {sr.community ? `Respondeu à história · ${sr.community}` : look ? "Você respondeu à história" : "Respondeu à sua história"}
        </span>
        <span className="block truncate opacity-80">{sr.preview}</span>
      </span>
    </>
  );
  const storyClass = clsx("mb-1.5 flex max-w-[260px] items-center gap-2 rounded-xl px-2 py-1.5 text-[11px]", look ? "bg-black/15 text-snow/85" : "bg-white/[0.06] text-white/60");
  const story =
    sr && !deleted ? (
      sr.slug ? (
        <a href={`/comunidades/${sr.slug}?story=${sr.id}`} className={storyClass}>
          {storyInner}
        </a>
      ) : (
        <div className={storyClass}>{storyInner}</div>
      )
    ) : null;

  let body: React.ReactNode;
  if (deleted) {
    body = (
      <span className={clsx("flex items-center gap-1.5 text-sm italic", look ? "text-snow/80" : "text-white/50")}>
        <Ban className="h-3.5 w-3.5" /> Mensagem apagada
      </span>
    );
  } else if (m.type === "sticker") body = <StickerView id={m.meta.sticker ?? ""} info={m.meta.stickerInfo} interactive={m.status !== "sending"} />;
  else if (m.type === "gif") body = <GifView message={m} onOpen={() => p.onOpenMedia(m, 0)} />;
  else if (emojiOnly) body = <span className="text-5xl leading-tight">{m.content.trim()}</span>;
  else if (media) body = <MediaGrid message={m} onOpen={(i) => p.onOpenMedia(m, i)} />;
  else if (m.type === "file") body = <div className="space-y-1">{m.attachments.map((a) => <FileCard key={a.path} a={a} mine={look} sending={m.status === "sending"} />)}</div>;
  else if (m.type === "voice") body = <VoicePlayer message={m} mine={look} meta={<Meta m={m} mine={look} state={state} favorite={favorite} />} />;
  else if (m.type === "music") body = <MusicCard message={m} mine={look} meta={<Meta m={m} mine={look} state={state} favorite={favorite} />} />;
  else if (m.type === "gift") body = <GiftCard message={m} mine={look} />;
  else if (m.type === "dice") body = <DiceCard message={m} mine={look} />;
  else if (m.type === "location") body = <LocationCard message={m} mine={look} />;
  else if (m.type === "contact") body = <ContactCard message={m} mine={look} />;
  else if (m.type === "poll") body = <PollCard message={m} mine={look} votes={p.votes} meId={p.meId} onVote={(ix) => p.onVote(m, ix)} />;
  else
    body = (
      <span className="whitespace-pre-wrap break-words text-[16px] leading-[1.45] lg:text-[14px] lg:leading-[1.45]">
        <RichText text={m.content} />
        {/* Reserva o espaço da hora no fim da última linha; a hora fica no canto (estilo app). */}
        <span aria-hidden className={clsx("inline-block h-3 align-baseline", look ? "w-[66px]" : "w-[44px]", (m.expiresAt || favorite) && "!w-[84px]")} />
      </span>
    );
  const textOnly = !deleted && !media && m.type === "text" && !emojiOnly;

  const showAvatarColumn = (group || !!origin) && !mine;

  if (p.flat) {
    const who = sender;
    const name = origin ? origin.senderName : who?.name ?? (mine ? "Você" : "Ex-membro");
    const boxed = card;
    return (
      <div
        id={`msg-${m.id}`}
        className={clsx(
          "group/msg relative flex gap-3 px-5 py-[3px] transition-colors hover:z-20 hover:bg-white/[0.03] focus-within:z-20",
          firstInRun && "mt-2.5",
          p.highlight && "animate-msg-flash",
          "animate-msg-in"
        )}
        onContextMenu={(e) => {
          if (window.matchMedia("(pointer: coarse)").matches) {
            e.preventDefault();
            p.onLongPress(m);
          }
        }}
      >
        <span className="w-9 shrink-0">
          {firstInRun ? (
            <ChatAvatar name={name} url={who?.avatarUrl ?? null} size={36} frame={who?.avatarFrame} />
          ) : (
            <span className="block pt-[3px] text-right text-[10px] leading-4 text-white/35 opacity-0 transition group-hover/msg:opacity-100">{formatTime(m.createdAt)}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          {firstInRun && (
            <div className="flex items-baseline gap-2">
              <span className={clsx("truncate text-[13px] font-semibold", group && !mine ? nameColor(m.senderId) : "text-chat")}>{name}</span>
              <span className="ml-auto shrink-0">
                <Meta m={m} mine={mine} state={state} favorite={favorite} plain />
              </span>
            </div>
          )}
          {savedHeader}
          {forwarded}
          {story}
          {replyBlock && <div className="max-w-[420px]">{replyBlock}</div>}
          <div className={clsx(boxed && "inline-block max-w-[420px] rounded-xl border border-white/10 bg-white/[0.04] p-2", media && "max-w-[420px] overflow-hidden rounded-xl")}>
            {textOnly ? (
              <span className="whitespace-pre-wrap break-words text-[14px] leading-[1.45] text-white/90">
                <RichText text={m.content} />
              </span>
            ) : (
              body
            )}
            {caption && (
              <span className="block whitespace-pre-wrap break-words pt-1.5 text-[14px] leading-[1.45] text-white/90">
                <RichText text={m.content} />
              </span>
            )}
          </div>
          {!firstInRun && (state === "sending" || state === "failed") && (
            <span className="ml-1 align-middle"><Meta m={m} mine={mine} state={state} favorite={favorite} plain /></span>
          )}
          {state === "failed" && (
            <button type="button" onClick={() => p.onRetry(m)} className="mt-0.5 block text-[11px] font-medium text-red-400 hover:underline">
              Não enviada · Clique para tentar de novo
            </button>
          )}
          {grouped.size > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Array.from(grouped.entries()).map(([emoji, g]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => p.onReact(m, emoji)}
                  aria-label={`${emoji} ${g.count}`}
                  className={clsx("flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-sm transition hover:scale-105", g.mine ? "border-chat/60 bg-chat/20" : "border-white/10 bg-white/[0.04]")}
                >
                  <span>{emoji}</span>
                  {g.count > 1 && <span className="text-[11px] font-semibold text-white/75">{g.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="absolute -top-3 right-4 z-10 rounded-full border border-transparent transition group-hover/msg:border-white/10 group-hover/msg:bg-space-surface group-hover/msg:shadow-lg">
          <HoverActions m={m} mine={false} favorite={favorite} myReaction={myReaction} inSaved={p.savedSpace} onReact={(e) => p.onReact(m, e)} onAction={(a) => p.onAction(m, a)} />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${m.id}`}
      className={clsx(
        // A mensagem em uso (menu aberto/foco) fica por cima das vizinhas.
        "group/msg relative flex items-end gap-2 px-3 hover:z-20 focus-within:z-20 md:px-6 lg:px-5",
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
        {group && !origin && !mine && firstInRun && (
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
                  "rounded-[22px] shadow-[0_2px_10px_rgba(0,0,0,0.18)] lg:rounded-[16px]",
                  mine
                    ? "bg-chat-bubble text-snow"
                    : "bg-[rgb(var(--chat-recv))] text-white",
                  lastInRun && (mine ? "rounded-br-md" : "rounded-bl-md"),
                  media || card ? "overflow-hidden" : "px-4 py-2 lg:px-3 lg:py-1.5",
                  card && !media && (inlineMeta ? "px-2 py-1.5" : "p-2"),
                  m.type === "gift" && !mine && "border-chat/30 shadow-[0_0_24px_rgb(var(--chat-accent,139_92_246)/0.18)]",
                  state === "failed" && "cursor-pointer ring-1 ring-red-400/60"
                )
          )}
        >
          {!bare && savedHeader}
          {!bare && forwarded}
          {!bare && story}
          {!bare && replyBlock}
          {bare && !deleted && (m.replyToId || m.meta.forwarded || origin) && (
            <div className={clsx("mb-1 max-w-[240px] rounded-2xl px-3 py-2", mine ? "bg-chat-bubble text-snow" : "border border-white/[0.08] bg-white/[0.07]")}>
              {savedHeader}
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

          {inlineMeta ? null : emojiOnly || m.type === "sticker" || (m.type === "gif" && m.meta.personalSticker) ? (
            <span className={clsx("mt-0.5 flex", mine ? "justify-end" : "justify-start")}>
              <Meta m={m} mine={mine} state={state} favorite={favorite} overlay />
            </span>
          ) : bare || (media && !caption) ? (
            <span className={clsx("absolute bottom-2", mine ? "right-2" : bare ? "left-2" : "right-2")}>
              <Meta m={m} mine={mine} state={state} favorite={favorite} overlay />
            </span>
          ) : textOnly ? (
            <span className="absolute bottom-[7px] right-3">
              <Meta m={m} mine={mine} state={state} favorite={favorite} />
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
        inSaved={p.savedSpace}
        onReact={(e) => p.onReact(m, e)}
        onAction={(a) => p.onAction(m, a)}
      />
    </div>
  );
});
