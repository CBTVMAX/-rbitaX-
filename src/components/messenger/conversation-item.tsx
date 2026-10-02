"use client";

import { memo } from "react";
import { clsx } from "clsx";
import { BellOff, Check, CheckCheck, Pin, Timer, Users } from "lucide-react";
import { listTime, toDate } from "@/lib/messenger/format";
import { conversationTitle, isMuted, type Conversation } from "@/lib/messenger/types";
import { VerifiedBadge } from "@/components/verified-badge";
import { ConversationAvatar } from "./ui";
import { typingLabel, useTypingIn } from "@/lib/messenger/typing";
import { TypingText } from "./typing-dots";

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
  const typing = typingLabel(useTypingIn(c.id, meId), c.isGroup);
  const prefix = !m || system || m.deleted ? "" : mine ? "Você: " : c.isGroup ? `${(m.senderName ?? "").split(" ")[0]}: ` : "";

  if (c.isSaved) {
    return (
      <button
        type="button"
        onClick={() => onOpen(c.id)}
        aria-current={active ? "true" : undefined}
        className={clsx(
          "group relative flex w-full items-center gap-3.5 border-b border-white/[0.08] px-1 pb-4 pt-2 text-left transition lg:gap-2.5 lg:rounded-xl lg:border lg:px-2.5 lg:py-2",
          active
            ? "lg:border-orbit-purple/45 lg:bg-orbit-purple/[0.16]"
            : "lg:border-white/[0.08] lg:bg-gradient-to-r lg:from-orbit-blue/[0.08] lg:via-orbit-purple/[0.06] lg:to-transparent lg:hover:border-white/15"
        )}
      >
        <span className="lg:hidden">
          <ConversationAvatar c={c} size={54} />
        </span>
        <span className="hidden lg:block">
          <ConversationAvatar c={c} size={44} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-semibold text-white lg:text-[14px]">Salvos</span>
            <span className="ml-auto hidden shrink-0 pl-2 text-[11px] text-white/40 lg:inline">{m ? listTime(m.createdAt) : ""}</span>
          </span>
          {/* Celular: "Foto · 10h" (VK); computador: subtítulo + prévia */}
          <span className="block truncate text-[15px] text-white/55 lg:hidden">
            {m && !m.deleted ? (
              <>
                {m.preview} <span className="text-white/40">· {listTime(m.createdAt)}</span>
              </>
            ) : (
              "Seu espaço pessoal"
            )}
          </span>
          <span className="hidden truncate text-[13px] text-white/55 lg:block">Seu espaço pessoal</span>
          {m && !m.deleted && <span className="mt-0.5 hidden truncate text-[12px] text-white/40 lg:block">{m.preview}</span>}
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
        "group relative flex w-full items-center gap-3.5 px-1 py-2.5 text-left transition lg:gap-2.5 lg:rounded-xl lg:px-2.5 lg:py-2",
        active ? "bg-orbit-purple/[0.14] ring-1 ring-inset ring-orbit-purple/30" : "hover:bg-white/[0.05]"
      )}
    >
      {active && <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-orbit-gradient" />}
      <span className="lg:hidden">
        <ConversationAvatar c={c} size={54} ringClass={active ? "border-space-surface" : "border-space-bg"} />
      </span>
      <span className="hidden lg:block">
        <ConversationAvatar c={c} size={44} ringClass={active ? "border-space-surface" : "border-space-bg"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {c.isGroup && <Users className="h-3.5 w-3.5 shrink-0 text-orbit-cyan/80" aria-label="Grupo" />}
          <span className={clsx("truncate text-[17px] text-white lg:text-[14px]", unread ? "font-semibold" : "font-medium")}>
            {conversationTitle(c)}
          </span>
          {!c.isGroup && c.otherUser?.isVerified && <VerifiedBadge className="h-[15px] w-[15px]" />}
          {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Silenciada" />}
          {c.messageTtlSeconds && <Timer className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Mensagens temporárias" />}
          <span className={clsx("ml-auto hidden shrink-0 pl-2 text-[11px] lg:inline", unread && !muted ? "font-semibold text-orbit-cyan" : "text-white/40")}>
            {m ? listTime(m.createdAt) : ""}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 lg:mt-0.5">
          {typing ? (
            <TypingText label={typing} className="flex-1 text-[15px] lg:text-[13px]" />
          ) : (
          <>
          {mine && !system && !m?.deleted && (
            <DeliveryTicks state={lastMessageState(c) ?? "sent"} className="shrink-0 text-white/60" />
          )}
          <span
            className={clsx(
              "min-w-0 truncate text-[15px] lg:flex-1 lg:text-[13px]",
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
          {/* Celular: a hora vem depois da prévia ("· 8m"), como no VK */}
          {m && <span className="shrink-0 text-[15px] text-white/40 lg:hidden">· {listTime(m.createdAt)}</span>}
          <span className="flex-1 lg:hidden" />
          </>
          )}
          {unread && (
            <span
              className={clsx(
                "flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-[14px] font-bold leading-none lg:h-5 lg:min-w-5 lg:px-1.5 lg:text-[11px]",
                // Celular: contador branco (VK); computador: degradê do app
                muted ? "bg-white/25 text-snow" : "bg-white text-[#111] lg:bg-orbit-gradient lg:text-snow lg:shadow-[0_0_10px_rgb(var(--app-accent,139_92_246)/0.5)]"
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
