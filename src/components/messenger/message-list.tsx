"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, Loader2, Lock } from "lucide-react";
import { dayLabel, sameDay, toDate } from "@/lib/messenger/format";
import type { ChatMessage, Member, PollVote, Reaction } from "@/lib/messenger/types";
import { MessageBubble, type BubbleProps } from "./message-bubble";
import type { DeliveryState } from "./message-actions";

const RUN_GAP_MS = 5 * 60 * 1000;

export function deliveryState(m: ChatMessage, othersReadAt: string | null): DeliveryState {
  if (m.status === "sending") return "sending";
  if (m.status === "failed") return "failed";
  if (othersReadAt && toDate(othersReadAt) >= toDate(m.createdAt)) return "seen";
  return m.deliveredAt ? "delivered" : "sent";
}

type Handlers = Pick<BubbleProps, "onReact" | "onAction" | "onLongPress" | "onOpenMedia" | "onVote" | "onJump" | "onRetry">;

export function MessageList({
  conversationKey,
  messages,
  meId,
  group,
  members,
  reactions,
  votes,
  favorites,
  othersReadAt,
  hasMore,
  hasNewer,
  loading,
  loadingMore,
  onLoadMore,
  onJumpToLatest,
  highlightId,
  unreadFromId,
  intro,
  handlers,
}: {
  conversationKey: string;
  messages: ChatMessage[];
  meId: string;
  group: boolean;
  members: Map<string, Member>;
  reactions: Map<string, Reaction[]>;
  votes: Map<string, PollVote[]>;
  favorites: Set<string>;
  othersReadAt: string | null;
  hasMore: boolean;
  hasNewer: boolean;
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onJumpToLatest: () => void;
  highlightId: string | null;
  unreadFromId: string | null;
  intro?: React.ReactNode;
  handlers: Handlers;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prev = useRef<{ key: string; first?: string; last?: string; height: number; count: number }>({ key: "", height: 0, count: 0 });
  const [showDown, setShowDown] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const byId = useRef(new Map<string, ChatMessage>());
  byId.current = new Map(messages.map((m) => [m.id, m]));

  // Keep the reading position: new conversation → unread marker or bottom; older page → stay put; new message → follow if at the bottom.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const first = messages[0]?.id;
    const last = messages[messages.length - 1]?.id;
    const p = prev.current;
    if (p.key !== conversationKey || (p.count === 0 && messages.length > 0)) {
      const marker = unreadFromId ? document.getElementById(`msg-${unreadFromId}`) : null;
      if (highlightId) document.getElementById(`msg-${highlightId}`)?.scrollIntoView({ block: "center" });
      else if (marker) el.scrollTop = Math.max(0, marker.offsetTop - 80);
      else el.scrollTop = el.scrollHeight;
      setUnseen(0);
    } else if (first !== p.first && last === p.last) {
      el.scrollTop += el.scrollHeight - p.height;
    } else if (last !== p.last) {
      const newest = messages[messages.length - 1];
      if (nearBottom.current || newest?.senderId === meId) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else if (newest && newest.senderId !== meId) {
        setUnseen((n) => n + 1);
      }
    }
    prev.current = { key: conversationKey, first, last, height: el.scrollHeight, count: messages.length };
  }, [messages, conversationKey, meId, unreadFromId, highlightId]);

  useEffect(() => {
    if (!highlightId) return;
    document.getElementById(`msg-${highlightId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId]);

  useEffect(() => {
    const el = top.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onLoadMore(), {
      root: scroller.current,
      rootMargin: "400px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onLoadMore, conversationKey]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottom.current = distance < 120;
    setShowDown(distance > 400 || hasNewer);
    if (nearBottom.current) setUnseen(0);
  }

  function toBottom() {
    if (hasNewer) {
      onJumpToLatest();
      return;
    }
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    setUnseen(0);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="orbit-scrollbar absolute inset-0 overflow-y-auto overscroll-contain pb-3 pt-2">
        <div ref={top} />
        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        )}
        {!hasMore && !loading && intro}
        {loading && messages.length === 0 ? (
          <div className="space-y-3 px-6 pt-6">
            {[48, 64, 36, 56, 44].map((w, i) => (
              <div key={i} className={clsx("flex", i % 2 ? "justify-end" : "justify-start")}>
                <div className="h-10 animate-pulse rounded-2xl bg-white/[0.06]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : (
          messages.map((m, i) => {
            const before = messages[i - 1];
            const after = messages[i + 1];
            const newDay = !before || !sameDay(before.createdAt, m.createdAt);
            const joins = (a?: ChatMessage, b?: ChatMessage) =>
              !!a &&
              !!b &&
              a.type !== "system" &&
              b.type !== "system" &&
              a.senderId === b.senderId &&
              sameDay(a.createdAt, b.createdAt) &&
              Math.abs(toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()) < RUN_GAP_MS;
            const firstInRun = newDay || !joins(before, m) || m.id === unreadFromId;
            const lastInRun = !joins(m, after) || after?.id === unreadFromId;
            const replyTo = m.replyToId ? byId.current.get(m.replyToId) ?? null : undefined;
            const replySender = replyTo ? (replyTo.senderId === meId ? "Você" : members.get(replyTo.senderId)?.name) : undefined;
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <div className="sticky top-1 z-[2] my-3 flex justify-center">
                    <span className="rounded-full border border-white/10 bg-space-surface/85 px-3 py-1 text-[11px] font-medium text-white/60 shadow-sm backdrop-blur">
                      {dayLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                {m.id === unreadFromId && (
                  <div className="my-3 flex items-center gap-3 px-6" role="separator">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-chat/60" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-chat">Novas mensagens</span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-chat/60" />
                  </div>
                )}
                <MessageBubble
                  m={m}
                  mine={m.senderId === meId}
                  meId={meId}
                  group={group}
                  sender={members.get(m.senderId)}
                  firstInRun={firstInRun}
                  lastInRun={lastInRun}
                  replyTo={replyTo}
                  replySenderName={replySender}
                  reactions={reactions.get(m.id) ?? EMPTY_REACTIONS}
                  votes={votes.get(m.id) ?? EMPTY_VOTES}
                  favorite={favorites.has(m.id)}
                  state={m.senderId === meId ? deliveryState(m, othersReadAt) : "sent"}
                  highlight={m.id === highlightId}
                  {...handlers}
                />
              </Fragment>
            );
          })
        )}
      </div>

      {(showDown || unseen > 0) && (
        <button
          type="button"
          onClick={toBottom}
          aria-label="Ir para as mensagens mais recentes"
          className="animate-pop-in absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-space-surface/95 text-white shadow-xl backdrop-blur transition hover:scale-105"
        >
          <ChevronDown className="h-5 w-5" />
          {unseen > 0 && (
            <span className="absolute -top-1.5 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-chat px-1 text-[10px] font-bold text-snow">
              {unseen}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

const EMPTY_REACTIONS: Reaction[] = [];
const EMPTY_VOTES: PollVote[] = [];

export function ChatIntro({ title, subtitle, privateNote }: { title: string; subtitle: string; privateNote?: boolean }) {
  return (
    <div className="mx-auto mb-4 mt-6 max-w-sm px-6 text-center">
      <p className="font-display text-base font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-white/50">{subtitle}</p>
      {privateNote && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/45">
          <Lock className="h-3 w-3" /> Conversa visível só para quem está nela
        </p>
      )}
    </div>
  );
}
