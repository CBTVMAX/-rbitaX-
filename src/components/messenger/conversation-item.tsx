"use client";

import { memo } from "react";
import { clsx } from "clsx";
import { BellOff, Check, CheckCheck, Pin, Timer, Users } from "lucide-react";
import { listTime, toDate } from "@/lib/messenger/format";
import { conversationTitle, isMuted, type Conversation } from "@/lib/messenger/types";
import { VerifiedBadge } from "@/components/verified-badge";
import { ConversationAvatar } from "./ui";

export function DeliveryTicks({
  state,
  className,
}: {
  state: "sending" | "sent" | "delivered" | "seen" | "failed";
  className?: string;
}) {
  if (state === "sent") return <Check aria-label="Enviada" className={clsx("h-3.5 w-3.5 opacity-70", className)} />;
  if (state === "delivered")
    return <CheckCheck aria-label="Entregue" className={clsx("h-3.5 w-3.5 opacity-70", className)} />;
  if (state === "seen") return <CheckCheck aria-label="Vista" className={clsx("h-3.5 w-3.5 text-orbit-cyan", className)} />;
  return null;
}

function lastMessageState(c: Conversation) {
  const m = c.lastMessage;
  if (!m) return null;
  if (c.othersReadAt && toDate(c.othersReadAt) >= toDate(m.createdAt)) return "seen" as const;
  return m.deliveredAt ? ("delivered" as const) : ("sent" as const);
}

export const ConversationItem = memo(function ConversationItem({
  c,
  meId,
  active,
  onOpen,
}: {
  c: Conversation;
  meId: string;
  active: boolean;
  onOpen: (id: string) => void;
}) {
  const muted = isMuted(c);
  const m = c.lastMessage;
  const mine = m?.senderId === meId;
  const unread = c.unread > 0;
  const system = m?.type === "system";
  const prefix = !m || system || m.deleted ? "" : mine ? "Você: " : c.isGroup ? `${(m.senderName ?? "").split(" ")[0]}: ` : "";

  if (c.isSaved) {
    return (
      <button
        type="button"
        onClick={() => onOpen(c.id)}
        aria-current={active ? "true" : undefined}
        className={clsx(
          "group relative flex w-full items-center gap-3.5 rounded-[24px] border px-4 py-3.5 text-left transition lg:gap-3 lg:rounded-2xl lg:px-3 lg:py-2.5",
          active
            ? "border-orbit-purple/45 bg-orbit-purple/[0.16]"
            : "border-white/[0.1] bg-gradient-to-br from-orbit-purple/[0.16] via-orbit-blue/[0.07] to-transparent shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:border-white/15"
        )}
      >
        <span className="lg:hidden">
          <ConversationAvatar c={c} size={60} />
        </span>
        <span className="hidden lg:block">
          <ConversationAvatar c={c} size={50} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-semibold text-white lg:text-[15px]">Salvos</span>
            <span className="ml-auto shrink-0 pl-2 text-[12px] text-white/45 lg:text-[11px]">{m ? listTime(m.createdAt) : ""}</span>
          </span>
          <span className="block truncate text-[14px] text-white/60 lg:text-[13px]">Seu espaço pessoal</span>
          {m && !m.deleted && <span className="mt-0.5 block truncate text-[13px] text-white/45 lg:text-[12px]">{m.preview}</span>}
        </span>
        <Pin className="h-3.5 w-3.5 shrink-0 self-end text-white/30" aria-label="Fixada" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      aria-current={active ? "true" : undefined}
      className={clsx(
        // Celular: linhas maiores com divisória (como no app); computador: compacto.
        "group relative flex w-full items-center gap-3.5 border-b border-white/[0.06] px-2 py-3.5 text-left transition last:border-b-0 lg:gap-3 lg:rounded-2xl lg:border-b-0 lg:px-3 lg:py-2.5",
        active ? "bg-orbit-purple/[0.14] ring-1 ring-inset ring-orbit-purple/30" : "hover:bg-white/[0.05]"
      )}
    >
      {active && <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-orbit-gradient" />}
      <span className="lg:hidden">
        <ConversationAvatar c={c} size={60} ringClass={active ? "border-space-surface" : "border-space-bg"} />
      </span>
      <span className="hidden lg:block">
        <ConversationAvatar c={c} size={50} ringClass={active ? "border-space-surface" : "border-space-bg"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {c.isGroup && <Users className="h-3.5 w-3.5 shrink-0 text-orbit-cyan/80" aria-label="Grupo" />}
          <span className={clsx("truncate text-[17px] text-white lg:text-[15px]", unread ? "font-semibold" : "font-medium")}>
            {conversationTitle(c)}
          </span>
          {!c.isGroup && c.otherUser?.isVerified && <VerifiedBadge className="h-[15px] w-[15px]" />}
          {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Silenciada" />}
          {c.messageTtlSeconds && <Timer className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Mensagens temporárias" />}
          <span className={clsx("ml-auto shrink-0 self-start pl-2 text-[13px] lg:self-auto lg:text-[11px]", unread && !muted ? "font-semibold text-orbit-cyan" : "text-white/45")}>
            {m ? listTime(m.createdAt) : ""}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 lg:mt-0.5">
          {mine && !system && !m?.deleted && (
            <DeliveryTicks state={lastMessageState(c) ?? "sent"} className="shrink-0 text-white/60" />
          )}
          <span
            className={clsx(
              "min-w-0 flex-1 truncate text-[15px] lg:text-[13px]",
              m?.deleted && "italic",
              unread ? "font-medium text-white/85" : "text-white/50"
            )}
          >
            {m ? (
              <>
                {prefix && <span className={unread ? "text-white/70" : "text-white/45"}>{prefix}</span>}
                {m.preview}
              </>
            ) : c.isGroup ? (
              `${c.memberCount} membros`
            ) : (
              "Diga oi 👋"
            )}
          </span>
          {unread && (
            <span
              className={clsx(
                "flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[13px] font-bold leading-none text-snow lg:h-5 lg:min-w-5 lg:px-1.5 lg:text-[11px]",
                muted ? "bg-white/25" : "bg-gradient-to-br from-[#ff4f8b] to-[#e8306b] shadow-[0_0_12px_rgba(255,79,139,0.5)]"
              )}
              aria-label={`${c.unread} não lidas`}
            >
              {c.unread > 99 ? "99+" : c.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
});
