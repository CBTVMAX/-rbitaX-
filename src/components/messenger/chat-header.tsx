"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  Archive,
  ArrowLeft,
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
  UserPlus,
  UserRound,
  Video,
  Wallpaper,
  X,
} from "lucide-react";
import { usePresenceText } from "@/components/presence-picker";
import { typingLabel, useTypingIn } from "@/lib/messenger/typing";
import { TypingText } from "./typing-dots";
import { useOnlineCount } from "@/lib/presence-live";
import { formatTime, messagePreview, toDate } from "@/lib/messenger/format";
import { conversationTitle, isMuted, MESSAGE_COLUMNS, toMessage, type ChatMessage, type Conversation, type Member } from "@/lib/messenger/types";
import { useMessenger } from "./context";
import { ConversationAvatar, IconButton, MenuItem, Popover } from "./ui";
import { AddMembersDialog } from "./dialogs";
import { VerifiedBadge } from "@/components/verified-badge";
import { useCalls } from "@/components/calls/call-provider";

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
          placeholder={c.isSaved ? "Buscar nos Salvos" : "Buscar nesta conversa"}
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
  onWallpaper,
  compact = false,
  extra,
}: {
  /** Abre a escolha do fundo da conversa (Preto, Branco, imagens, foto sua). */
  onWallpaper?: () => void;
  compact?: boolean;
  extra?: React.ReactNode;
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
  const { toast, me, supabase, reloadConversations } = useMessenger();
  const [menu, setMenu] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // Grupo não tem chamada: o atalho do cabeçalho é adicionar pessoas (só para quem administra).
  const canAdd = c.isGroup && (c.role === "owner" || c.role === "admin");
  const other = c.otherUser;
  const presence = usePresenceText(c.isGroup ? null : other?.id, other?.presence);
  const typing = typingLabel(useTypingIn(c.id, me.id), c.isGroup);
  const onlineInGroup = useOnlineCount(c.isGroup ? members.filter((m) => m.id !== me.id).map((m) => m.id) : []);
  const muted = isMuted(c);
  const { startCall } = useCalls();
  const call = (kind: "voice" | "video") => () => {
    if (c.isGroup || !other) return toast("Chamadas em grupo chegam em breve ao ÓrbitaX.");
    startCall({ conversationId: c.id, peer: { id: other.id, name: other.name, username: other.username, avatarUrl: other.avatarUrl }, kind });
  };

  return (
    <header
      className={clsx(
        "relative z-20 flex shrink-0 items-center gap-1 backdrop-blur-xl",
        compact
          ? "h-14 border-b border-white/10 bg-space-surface/75 px-1.5"
          : // Barra sólida (celular e computador, como no app).
            "min-h-[58px] border-b border-white/[0.06] bg-[rgb(var(--chat-bar)/0.95)] px-1.5 pt-[env(safe-area-inset-top)] lg:min-h-[52px] lg:bg-transparent lg:px-2 lg:backdrop-blur-none md:gap-2"
      )}
    >
      {showBack ? (
        <IconButton label="Voltar para conversas" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
      ) : (
        !compact && (
          // Computador (como no VK): X fecha a conversa e volta para "Escolha um chat".
          <IconButton label="Fechar conversa" onClick={onBack} className="hidden lg:flex">
            <X className="h-5 w-5" />
          </IconButton>
        )
      )}

      {searchOpen ? (
        <ChatSearch c={c} onClose={onToggleSearch} onJump={onJump} />
      ) : c.isSaved ? (
        <>
          <button
            type="button"
            onClick={onToggleInfo}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1.5 py-1 text-left transition hover:bg-white/[0.04]"
          >
            <ConversationAvatar c={c} size={compact ? 36 : 42} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-white">Salvos</span>
              <span className="block truncate text-xs text-white/50">Seu espaço pessoal</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center">
            <IconButton label="Buscar nos Salvos" onClick={onToggleSearch}>
              <Search className="h-[19px] w-[19px]" />
            </IconButton>
            {!compact && (
              <IconButton label={infoOpen ? "Fechar mídia e arquivos" : "Mídia e arquivos salvos"} onClick={onToggleInfo} active={infoOpen}>
                {infoOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
              </IconButton>
            )}
            {extra}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={c.isGroup ? onToggleInfo : onOpenProfile}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1.5 py-1 text-left transition hover:bg-white/[0.04]"
          >
            {compact ? (
              <ConversationAvatar c={c} size={36} ringClass="border-space-surface" />
            ) : (
              <>
                <span className="lg:hidden">
                  <ConversationAvatar c={c} size={52} ringClass="border-space-surface" />
                </span>
                <span className="hidden lg:block">
                  <ConversationAvatar c={c} size={34} ringClass="border-space-surface" />
                </span>
              </>
            )}
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className={clsx("truncate font-semibold text-white", compact ? "text-[15px]" : "text-[17px] lg:text-[13.5px]")}>{conversationTitle(c)}</span>
                {!c.isGroup && other?.isVerified && <VerifiedBadge />}
                {muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Silenciada" />}
                {c.messageTtlSeconds && <Timer className="h-3.5 w-3.5 shrink-0 text-white/35" aria-label="Mensagens temporárias" />}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/50">
                {typing ? (
                  <TypingText label={typing} className={!compact ? "text-[13px]" : undefined} />
                ) : c.isGroup ? (
                  <span className="truncate">
                    {c.memberCount} membros{onlineInGroup > 0 && <span className="text-emerald-400"> · {onlineInGroup} online</span>}
                  </span>
                ) : (
                  <>
                    <span className={clsx("truncate", !compact && "hidden")}>@{other?.username}</span>
                    <span className={clsx("text-white/25", !compact && "hidden")}>·</span>
                    <span className={clsx("flex min-w-0 items-center gap-1", !compact && "text-[13px] lg:text-[12px]", presence.color)}>
                      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", presence.dot)} />
                      <span className="truncate">{presence.text}</span>
                    </span>
                  </>
                )}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center">
            {canAdd && (
              <IconButton label="Adicionar pessoas" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-5 w-5" />
              </IconButton>
            )}
            {!c.isGroup && (
              <>
                <IconButton label="Chamada de voz" onClick={call("voice")}>
                  <Phone className="h-[19px] w-[19px]" />
                </IconButton>
                <IconButton label="Chamada de vídeo" onClick={call("video")}>
                  <Video className="h-5 w-5" />
                </IconButton>
              </>
            )}
            {!compact && (
              <IconButton label="Buscar na conversa" onClick={onToggleSearch}>
                <Search className="h-[19px] w-[19px]" />
              </IconButton>
            )}
            <IconButton label={infoOpen ? "Fechar informações" : "Informações da conversa"} onClick={onToggleInfo} active={infoOpen} className={compact ? "hidden" : "hidden lg:flex"}>
              {infoOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </IconButton>
            <div className="relative">
              <IconButton label="Mais opções" onClick={() => setMenu((v) => !v)} active={menu}>
                <MoreVertical className="h-5 w-5" />
              </IconButton>
              <Popover open={menu} onClose={() => setMenu(false)} className="right-0 top-full mt-1 w-60">
                {!c.isGroup && <MenuItem icon={UserRound} label="Ver perfil" onClick={() => { setMenu(false); onOpenProfile(); }} />}
                {compact && <MenuItem icon={Search} label="Buscar na conversa" onClick={() => { setMenu(false); onToggleSearch(); }} />}
                <MenuItem icon={PanelRightOpen} label="Informações da conversa" onClick={() => { setMenu(false); onToggleInfo(); }} />
                {onWallpaper && <MenuItem icon={Wallpaper} label="Papel de parede" onClick={() => { setMenu(false); onWallpaper(); }} />}
                <MenuItem icon={muted ? Bell : BellOff} label={muted ? "Reativar notificações" : "Silenciar"} onClick={() => { setMenu(false); onMute(); }} />
                <MenuItem icon={Archive} label={c.archivedAt ? "Desarquivar" : "Arquivar"} onClick={() => { setMenu(false); onArchive(); }} />
                <div className="my-1 h-px bg-white/[0.07]" />
                <MenuItem icon={Trash2} label={c.isGroup ? "Sair do grupo" : "Excluir conversa"} danger onClick={() => { setMenu(false); onDelete(); }} />
              </Popover>
            </div>
            {extra}
          </div>
        </>
      )}
      {canAdd && (
        <AddMembersDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          existing={members.map((m) => m.id)}
          onAdd={async (ids) => {
            const { error } = await supabase.rpc("add_group_members", { p_conversation_id: c.id, p_member_ids: ids });
            if (error) toast("Não foi possível adicionar. Só amigos podem entrar no grupo.", "error");
            else {
              toast(ids.length > 1 ? "Pessoas adicionadas." : "Pessoa adicionada.");
              setAddOpen(false);
              reloadConversations();
            }
          }}
        />
      )}
    </header>
  );
}
