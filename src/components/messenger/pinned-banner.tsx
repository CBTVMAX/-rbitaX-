"use client";

import { Pin, X } from "lucide-react";
import type { PinnedMessage } from "@/lib/messenger/group-rules";

/** Faixa logo abaixo do cabeçalho com a mensagem fixada (toque leva até ela; X desafixa). */
export function PinnedBanner({
  pinned,
  canUnpin,
  meId,
  onOpen,
  onUnpin,
}: {
  pinned: PinnedMessage;
  canUnpin: boolean;
  meId: string;
  onOpen: () => void;
  onUnpin: () => void;
}) {
  const who = pinned.senderId === meId ? "Você" : pinned.senderName?.split(" ")[0] ?? null;
  return (
    <div className="relative z-[5] flex items-center gap-1 border-b border-white/[0.07] bg-[rgb(var(--chat-bar)/0.95)] pl-3 pr-1.5 backdrop-blur-md">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left" aria-label="Ir para a mensagem fixada">
        <span className="h-8 w-[3px] shrink-0 rounded-full bg-chat" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-chat">
            <Pin className="h-3.5 w-3.5 rotate-45" /> Mensagem fixada
          </span>
          <span className="block truncate text-[13px] text-white/70">
            {who && <span className="text-white/90">{who}: </span>}
            {pinned.preview}
          </span>
        </span>
      </button>
      {canUnpin && (
        <button
          type="button"
          onClick={onUnpin}
          aria-label="Desafixar mensagem"
          title="Desafixar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  );
}
