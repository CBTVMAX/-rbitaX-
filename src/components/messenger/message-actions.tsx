"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";
import { Bookmark, Copy, Download, Forward, MoreHorizontal, Reply, SmilePlus, Star, Trash2 } from "lucide-react";
import { QUICK_REACTIONS } from "@/lib/messenger/emoji";
import { formatTime, toDate } from "@/lib/messenger/format";
import type { ChatMessage } from "@/lib/messenger/types";
import { GhostButton, MenuItem, Modal, Popover } from "./ui";

export type MessageAction = "reply" | "copy" | "forward" | "favorite" | "delete" | "save" | "download";

export type DeliveryState = "sending" | "sent" | "delivered" | "seen" | "failed";

const STATE_LABEL: Record<DeliveryState, string> = {
  sending: "Enviando…",
  sent: "Enviada",
  delivered: "Entregue",
  seen: "Vista",
  failed: "Não enviada",
};

export function canCopy(m: ChatMessage) {
  return !m.deletedAt && !!m.content.trim();
}

export function canForward(m: ChatMessage) {
  return !m.deletedAt && !m.status && m.type !== "system" && m.type !== "gift";
}

export function canDownload(m: ChatMessage) {
  return !m.deletedAt && !m.status && m.attachments.length > 0;
}

export function ReactionBar({
  current,
  onPick,
  className,
}: {
  current?: string | null;
  onPick: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-0.5", className)}>
      {QUICK_REACTIONS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          aria-label={`Reagir com ${e}`}
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:scale-125 active:scale-95",
            current === e && "bg-chat/20"
          )}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function MenuEntries({
  m,
  mine,
  favorite,
  inSaved,
  onAction,
}: {
  m: ChatMessage;
  mine: boolean;
  favorite: boolean;
  inSaved?: boolean;
  onAction: (a: MessageAction) => void;
}) {
  const live = !m.deletedAt && !m.status;
  return (
    <>
      {live && <MenuItem icon={Reply} label="Responder" onClick={() => onAction("reply")} />}
      {canCopy(m) && <MenuItem icon={Copy} label="Copiar texto" onClick={() => onAction("copy")} />}
      {!inSaved && live && m.type !== "system" && m.type !== "gift" && (
        <MenuItem icon={Bookmark} label="Salvar nos meus salvos" onClick={() => onAction("save")} />
      )}
      {canForward(m) && <MenuItem icon={Forward} label="Encaminhar" onClick={() => onAction("forward")} />}
      {live && (
        <MenuItem icon={Star} label={favorite ? "Remover dos favoritos" : "Favoritar"} onClick={() => onAction("favorite")} />
      )}
      {canDownload(m) && <MenuItem icon={Download} label={m.attachments.length > 1 ? "Baixar arquivos" : "Baixar"} onClick={() => onAction("download")} />}
      {!m.status && <MenuItem icon={Trash2} label="Apagar" danger onClick={() => onAction("delete")} />}
      {m.status === "failed" && mine && <MenuItem icon={Trash2} label="Descartar" danger onClick={() => onAction("delete")} />}
    </>
  );
}

/** Desktop: small toolbar next to the bubble on hover (react · reply · more). */
export function HoverActions({
  m,
  mine,
  favorite,
  myReaction,
  inSaved,
  onReact,
  onAction,
}: {
  m: ChatMessage;
  mine: boolean;
  favorite: boolean;
  myReaction: string | null;
  inSaved?: boolean;
  onReact: (emoji: string) => void;
  onAction: (a: MessageAction) => void;
}) {
  const [reactOpen, setReactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [below, setBelow] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const live = !m.deletedAt && !m.status;
  const openAny = reactOpen || menuOpen;
  // Open over the bubble (never toward the screen edge), and downward near the top of the chat.
  const place = () => {
    const el = bar.current;
    if (!el) return;
    // Room above inside the message area (not the window): the menu has up to 7 entries.
    const top = el.getBoundingClientRect().top;
    const area = el.closest(".orbit-scrollbar")?.getBoundingClientRect().top ?? 0;
    setBelow(top - area < 300);
  };

  return (
    <div
      ref={bar}
      className={clsx(
        "relative hidden shrink-0 items-center self-center md:flex",
        openAny ? "opacity-100" : "opacity-0 transition-opacity group-hover/msg:opacity-100 group-focus-within/msg:opacity-100",
        mine ? "order-first mr-1.5 flex-row-reverse" : "ml-1.5"
      )}
    >
      {live && (
        <button
          type="button"
          onClick={() => {
            place();
            setReactOpen((v) => !v);
          }}
          aria-label="Reagir"
          title="Reagir"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.08] hover:text-white"
        >
          <SmilePlus className="h-[18px] w-[18px]" />
        </button>
      )}
      {live && (
        <button
          type="button"
          onClick={() => onAction("reply")}
          aria-label="Responder"
          title="Responder"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Reply className="h-[18px] w-[18px]" />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          place();
          setMenuOpen((v) => !v);
        }}
        aria-label="Mais ações"
        title="Mais"
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.08] hover:text-white"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" />
      </button>

      <Popover
        open={reactOpen}
        onClose={() => setReactOpen(false)}
        className={clsx("rounded-full px-1 py-1", below ? "top-full mt-1" : "bottom-full mb-1", mine ? "left-0" : "right-0")}
      >
        <ReactionBar
          current={myReaction}
          onPick={(e) => {
            setReactOpen(false);
            onReact(e);
          }}
        />
      </Popover>
      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        className={clsx("w-56", below ? "top-full mt-1" : "bottom-full mb-1", mine ? "left-0" : "right-0")}
      >
        <MenuEntries
          m={m}
          mine={mine}
          favorite={favorite}
          inSaved={inSaved}
          onAction={(a) => {
            setMenuOpen(false);
            onAction(a);
          }}
        />
      </Popover>
    </div>
  );
}

/** Phones: long press opens this sheet (reactions, actions, time and status). */
export function MessageActionSheet({
  m,
  mine,
  favorite,
  myReaction,
  state,
  inSaved,
  onClose,
  onReact,
  onAction,
}: {
  m: ChatMessage | null;
  mine: boolean;
  favorite: boolean;
  myReaction: string | null;
  state: DeliveryState | null;
  inSaved?: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onAction: (a: MessageAction) => void;
}) {
  if (!m) return null;
  const live = !m.deletedAt && !m.status;
  const d = toDate(m.createdAt);
  return (
    <Modal open onClose={onClose} size="sm">
      <div className="-mx-5 -mt-1">
        {live && (
          <div className="flex justify-center border-b border-white/10 px-2 pb-3 pt-2">
            <ReactionBar
              current={myReaction}
              onPick={(e) => {
                onClose();
                onReact(e);
              }}
            />
          </div>
        )}
        <p className="px-5 pb-1 pt-3 text-xs text-white/45">
          {d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} às {formatTime(d)}
          {mine && state && !inSaved && ` · ${STATE_LABEL[state]}`}
          {m.expiresAt && ` · some às ${formatTime(m.expiresAt)}`}
        </p>
        <MenuEntries
          m={m}
          mine={mine}
          favorite={favorite}
          inSaved={inSaved}
          onAction={(a) => {
            onClose();
            onAction(a);
          }}
        />
      </div>
    </Modal>
  );
}

export function DeleteDialog({
  m,
  mine,
  inSaved,
  onClose,
  onDelete,
}: {
  m: ChatMessage | null;
  mine: boolean;
  inSaved?: boolean;
  onClose: () => void;
  onDelete: (forEveryone: boolean) => void;
}) {
  if (!m) return null;
  if (inSaved) {
    return (
      <Modal open onClose={onClose} title="Remover dos Salvos?" size="sm">
        <p className="text-sm text-white/60">O item sai do seu espaço pessoal, com os arquivos. A mensagem original continua onde estava.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={() => onDelete(true)} className="rounded-full bg-red-500/90 py-2.5 text-sm font-semibold text-snow transition hover:bg-red-500">
            Remover
          </button>
          <GhostButton onClick={onClose}>Cancelar</GhostButton>
        </div>
      </Modal>
    );
  }
  const canEveryone = mine && !m.deletedAt && !m.status;
  return (
    <Modal open onClose={onClose} title="Apagar mensagem?" size="sm">
      <p className="text-sm text-white/60">
        {canEveryone
          ? "Você pode apagar só para você ou para todos da conversa. Arquivos enviados também são removidos."
          : "A mensagem some apenas para você. As outras pessoas continuam vendo."}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {canEveryone && (
          <button
            type="button"
            onClick={() => onDelete(true)}
            className="rounded-full bg-red-500/90 py-2.5 text-sm font-semibold text-snow transition hover:bg-red-500"
          >
            Apagar para todos
          </button>
        )}
        <GhostButton danger onClick={() => onDelete(false)}>
          Apagar para mim
        </GhostButton>
        <GhostButton onClick={onClose}>Cancelar</GhostButton>
      </div>
    </Modal>
  );
}
