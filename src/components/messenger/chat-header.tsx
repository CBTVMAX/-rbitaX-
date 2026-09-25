"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellOff,
  Loader2,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  Phone,
  Search,
  Timer,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { PRESENCE, presenceOf } from "@/lib/presence";
import { formatTime, messagePreview, toDate } from "@/lib/messenger/format";
import { conversationTitle, isMuted, MESSAGE_COLUMNS, toMessage, type ChatMessage, type Conversation, type Member } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { ConversationAvatar, IconButton, MenuItem, Popover } from "./ui";

function ChatSearch({ c, onClose, onJump }: { c: Conversation; onClose: () => void; onJump: (m: ChatMessage) => void }) {
  const { supabase } = useMessenger();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ChatMessage[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("Message")
        .select(MESSAGE_COLUMNS)
        .eq("conversationId", c.id)
        .is("deletedAt", null)
        .neq("type", "system")
        .ilike("content", `%${term.replace(/[%_\\]/g, (x) => `\\${x}`)}%`)
        .order("createdAt", { ascending: false })
        .limit(40);
      setResults((data ?? []).map((r) => toMessage(r as Record<string, unknown>)));
      setBusy(false);
    }, 280);
    return () => clearTimeout(t);
  }, [q, c.id, supabase]);

  return (
    <div className="relative flex-1">
      <label className="flex items-center gap-2 rounded-2xl border border-chat/40 bg-white/[0.05] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-white/45" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Buscar nesta conversa"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-white/40" />
        ) : (
          results && <span className="shrink-0 text-xs text-white/45">{results.length === 40 ? "40+" : results.length}</span>
        )}
        <button type="button" onClick={onClose} aria-label="Fechar busca" className="text-white/50 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </label>
      {results && (
        <div className="animate-pop-in orbit-scrollbar absolute left-0 right-0 top-full z-40 mt-2 max-h-[min(60vh,420px)] overflow-y-auto rounded-2xl border border-white/10 bg-space-surface/95 py-1.5 shadow-2xl backdrop-blur-xl">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-white/45">Nenhuma mensagem com “{q.trim()}”.</p>
          ) : (
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onJump(m);
                  onClose();
                }}
                className="block w-full px-4 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <span className="line-clamp-2 text-sm text-white/85">{messagePreview(m.type, m.content, m.meta, m.attachments)}</span>
                <span className="text-[11px] text-white/40">
                  {toDate(m.createdAt).toLocaleDateString("pt-BR")} · {formatTime(m.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ChatHeader({
  c,
  members,
  showBack,
  onBack,
  infoOpen,
  onToggleInfo,
  onOpenProfile,
  searchOpen,
  onToggleSearch,
  onJump,
  onMute,
  onArchive,
  onDelete,
}: {
  c: Conversation;
  members: Member[];
  showBack: boolean;
  onBack: () => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
  onOpenProfile: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onJump: (m: ChatMessage) => void;
  onMute: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { toast, me } = useMessenger();
  const [menu, setMenu] = useState(false);
  const other = c.otherUser;
  const presence = PRESENCE[presenceOf(other?.presence)];
  const onlineInGroup = members.filter((m) => m.id !== me.id && presenceOf(m.presence) === "online").length;
  const muted = isMuted(c);
  const soon = (what: string) => () => toast(`Chamadas de ${what} chegam em breve ao ÓrbitaX.`);

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center gap-1 border-b border-white/10 bg-space-surface/75 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:gap-2 md:px-4">
      {showBack && (
        <IconButton label="Voltar para conversas" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
      )}

      {searchOpen ? (
        <ChatSearch c={c} onClose={onToggleSearch} onJump={onJump} />
      ) : (
        <>
          <button
            type="button"
            onClick={c.isGroup ? onToggleInfo : onOpenProfile}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1.5 py-1 text-left transition hover:bg-white/[0.04]"
          >
            <ConversationAvatar c={c} size={42} ringClass="border-space-surface" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-semibold text-white">{conversationTitle(c)}</span>
                {!c.isGroup && other?.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-orbit-cyan" aria-label="Verificado" />}
                {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Silenciada" />}
                {c.messageTtlSeconds && <Timer className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Mensagens temporárias" />}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/50">
                {c.isGroup ? (
                  <span className="truncate">
                    {c.memberCount} membros{onlineInGroup > 0 && <span className="text-emerald-400"> · {onlineInGroup} online</span>}
                  </span>
                ) : (
                  <>
                    <span className="truncate">@{other?.username}</span>
                    <span className="text-white/25">·</span>
                    <span className={clsx("flex shrink-0 items-center gap-1", presence.text)}>
                      <span className={clsx("h-1.5 w-1.5 rounded-full", presence.dot)} />
                      {presence.label}
                    </span>
                  </>
                )}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center">
            <IconButton label="Chamada de voz (em breve)" onClick={soon("voz")} className="hidden sm:flex">
              <Phone className="h-[19px] w-[19px]" />
            </IconButton>
            <IconButton label="Chamada de vídeo (em breve)" onClick={soon("vídeo")} className="hidden sm:flex">
              <Video className="h-5 w-5" />
            </IconButton>
            <IconButton label="Buscar na conversa" onClick={onToggleSearch}>
              <Search className="h-[19px] w-[19px]" />
            </IconButton>
            <IconButton label={infoOpen ? "Fechar informações" : "Informações da conversa"} onClick={onToggleInfo} active={infoOpen} className="hidden lg:flex">
              {infoOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </IconButton>
            <div className="relative">
              <IconButton label="Mais opções" onClick={() => setMenu((v) => !v)} active={menu}>
                <MoreVertical className="h-5 w-5" />
              </IconButton>
              <Popover open={menu} onClose={() => setMenu(false)} className="right-0 top-full mt-1 w-60">
                {!c.isGroup && <MenuItem icon={UserRound} label="Ver perfil" onClick={() => { setMenu(false); onOpenProfile(); }} />}
                <MenuItem icon={PanelRightOpen} label="Informações da conversa" onClick={() => { setMenu(false); onToggleInfo(); }} />
                <div className="sm:hidden">
                  <MenuItem icon={Phone} label="Chamada de voz" hint="Em breve" onClick={() => { setMenu(false); soon("voz")(); }} />
                  <MenuItem icon={Video} label="Chamada de vídeo" hint="Em breve" onClick={() => { setMenu(false); soon("vídeo")(); }} />
                </div>
                <MenuItem icon={muted ? Bell : BellOff} label={muted ? "Reativar notificações" : "Silenciar"} onClick={() => { setMenu(false); onMute(); }} />
                <MenuItem icon={Archive} label={c.archivedAt ? "Desarquivar" : "Arquivar"} onClick={() => { setMenu(false); onArchive(); }} />
                <div className="my-1 h-px bg-white/[0.07]" />
                <MenuItem icon={Trash2} label={c.isGroup ? "Sair do grupo" : "Excluir conversa"} danger onClick={() => { setMenu(false); onDelete(); }} />
              </Popover>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
