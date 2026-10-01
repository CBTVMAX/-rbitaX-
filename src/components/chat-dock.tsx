"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { AlertCircle, Bookmark, CheckCircle2, ChevronsLeft, Maximize2, MessageCircle, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveCounts } from "@/components/live-activity";
import { conversationTitle, type ChatUser, type Conversation } from "@/lib/messenger/types";
import { formatTime } from "@/lib/messenger/format";
import { MessengerContext, useMessenger, type MessengerContextValue } from "@/components/messenger/context";
import { ChatView } from "@/components/messenger/chat-view";
import { ChatAvatar, ConversationAvatar } from "@/components/messenger/ui";
import { loadFriends } from "@/components/messenger/dialogs";

const RAIL_KEY = "orbitax:chat-rail";
const RAIL_SIZE = 9; // conversas mostradas na faixa lateral

type Toast = { id: number; text: string; tone: "info" | "error" };

function normalizeRow(row: Record<string, unknown>): Conversation {
  return {
    ...(row as unknown as Conversation),
    isSaved: Boolean(row.isSaved),
    otherUser: (row.otherUser as ChatUser | null) ?? null,
    lastMessage: (row.lastMessage as Conversation["lastMessage"]) ?? null,
  };
}

function Badge({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={clsx("flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-space-surface bg-chat px-1 text-[10px] font-bold leading-none text-snow", className)}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

/**
 * Messenger do computador no estilo VK: uma faixa à direita com os Salvos e as conversas
 * recentes (com não lidas), a lista completa de chats e contatos, e a conversa aberta numa
 * janela flutuante. A janela é a mesma conversa do Messenger — reações, respostas, adesivos,
 * emojis, mídia, áudio e enquetes aparecem iguais ao celular. No celular não aparece.
 */
export function ChatDock({ me }: { me: ChatUser }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const { refresh: refreshCounts } = useLiveCounts();
  const [desktop, setDesktop] = useState(false);
  const [rail, setRail] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [jump, setJump] = useState<{ conversationId: string; messageId: string } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    try {
      setRail(localStorage.getItem(RAIL_KEY) !== "0");
    } catch {
      // storage indisponível: faixa aberta
    }
    return () => mq.removeEventListener("change", on);
  }, []);

  const showRail = useCallback((next: boolean) => {
    setRail(next);
    if (!next) setListOpen(false);
    try {
      localStorage.setItem(RAIL_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toast = useCallback((text: string, tone: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-1), { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), tone === "error" ? 5000 : 2800);
  }, []);

  const reloadConversations = useCallback(async () => {
    const { data } = await supabase.rpc("my_conversations");
    if (data) setConversations((data as unknown as Record<string, unknown>[]).map(normalizeRow));
  }, [supabase]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      reloadConversations();
      refreshCounts();
    }, 350);
  }, [reloadConversations, refreshCounts]);

  const patchConversation = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return patch.sortAt ? [...next].sort((a, b) => (b.sortAt ?? "").localeCompare(a.sortAt ?? "")) : next;
    });
  }, []);

  const openConversation = useCallback((id: string, messageId?: string) => {
    setJump(messageId ? { conversationId: id, messageId } : null);
    setActiveId(id);
    setListOpen(false);
  }, []);

  const startDirect = useCallback(
    async (user: ChatUser) => {
      const { data: id, error } = await supabase.rpc("get_or_create_dm", { other_user_id: user.id });
      if (error || !id) return toast(`Você e ${user.name} ainda não são amigos. O chat é liberado quando o pedido for aceito.`, "error");
      await reloadConversations();
      openConversation(id as string);
    },
    [supabase, reloadConversations, openConversation, toast]
  );

  useEffect(() => {
    if (!desktop) return;
    reloadConversations();
    const channel = supabase
      .channel(`chatdock:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, scheduleReload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Message" }, scheduleReload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Conversation" }, scheduleReload)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ConversationMember", filter: `userId=eq.${me.id}` }, scheduleReload)
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && scheduleReload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [desktop, supabase, me.id, reloadConversations, scheduleReload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (listOpen) setListOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen]);

  const savedId = conversations.find((c) => c.isSaved)?.id ?? null;
  const ctx: MessengerContextValue = useMemo(
    () => ({ me, supabase, conversations, toast, reloadConversations, patchConversation, openConversation, startDirect, savedId }),
    [me, supabase, conversations, toast, reloadConversations, patchConversation, openConversation, startDirect, savedId]
  );

  // No próprio Messenger a faixa não aparece (evita duplicar a conversa).
  if (!desktop || pathname.startsWith("/mensagens")) return null;

  const chats = conversations.filter((c) => !c.isSaved && !c.archivedAt);
  const unreadTotal = chats.reduce((n, c) => n + (c.unread || 0), 0);
  const active = activeId ? conversations.find((x) => x.id === activeId) ?? null : null;
  const railChats = chats.slice(0, RAIL_SIZE);
  // A conversa aberta sempre aparece na faixa, mesmo que esteja mais abaixo na lista.
  if (active && !active.isSaved && !railChats.some((c) => c.id === active.id)) railChats.push(active);

  const winBtn = "flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white";

  return (
    <MessengerContext.Provider value={ctx}>
      {/* Janela da conversa: a conversa completa do Messenger, em tamanho de janela. */}
      {active && (
        <section
          aria-label={active.isSaved ? "Salvos" : `Conversa com ${conversationTitle(active)}`}
          className={clsx(
            "animate-pop-in fixed bottom-4 z-40 flex h-[min(620px,calc(100dvh-6rem))] w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-surface shadow-[0_24px_70px_rgba(0,0,0,0.45)]",
            rail ? "right-[92px]" : "right-6"
          )}
        >
          <ChatView
            key={active.id}
            c={active}
            visible
            showBack={false}
            onBack={() => setActiveId(null)}
            jumpToMessageId={jump?.conversationId === active.id ? jump.messageId : null}
            compact
            headerActions={
              <>
                <Link href={`/mensagens?c=${encodeURIComponent(active.id)}`} aria-label="Abrir no Messenger completo" title="Expandir" className={winBtn}>
                  <Maximize2 className="h-4 w-4" />
                </Link>
                <button type="button" onClick={() => setActiveId(null)} aria-label="Fechar conversa" title="Fechar" className={winBtn}>
                  <X className="h-5 w-5" />
                </button>
              </>
            }
          />
        </section>
      )}

      {/* Lista completa: chats e contatos, com busca. */}
      {listOpen && rail && <ChatList chats={chats} me={me} activeId={activeId} onOpen={openConversation} onClose={() => setListOpen(false)} />}

      {rail ? (
        <nav
          aria-label="Conversas"
          className="fixed bottom-4 right-3 top-20 z-40 flex w-[68px] flex-col items-center gap-1 rounded-2xl border border-white/10 bg-space-surface/90 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            aria-label={listOpen ? "Fechar lista de chats" : "Abrir lista de chats e contatos"}
            title="Chats"
            className={clsx("flex h-9 w-9 items-center justify-center rounded-full transition", listOpen ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/10 hover:text-white")}
          >
            <ChevronsLeft className={clsx("h-5 w-5 transition", listOpen && "rotate-180")} />
          </button>

          {savedId && (
            <button
              type="button"
              onClick={() => (activeId === savedId ? setActiveId(null) : openConversation(savedId))}
              aria-label="Salvos"
              title="Salvos"
              className={clsx("mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-chat text-snow shadow-glow transition hover:scale-105", activeId === savedId && "ring-2 ring-white/70 ring-offset-2 ring-offset-space-surface")}
            >
              <Bookmark className="h-5 w-5" />
            </button>
          )}

          <div className="no-scrollbar mt-1 flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1 py-1">
            {railChats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => (activeId === c.id ? setActiveId(null) : openConversation(c.id))}
                aria-label={`${conversationTitle(c)}${c.unread ? `, ${c.unread} não lidas` : ""}`}
                title={conversationTitle(c)}
                className={clsx("relative shrink-0 rounded-full transition hover:scale-105", activeId === c.id && "ring-2 ring-chat ring-offset-2 ring-offset-space-surface")}
              >
                <ConversationAvatar c={c} size={48} ringClass="border-space-surface" />
                <Badge n={c.unread} className="absolute -left-1 -top-1" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => showRail(false)}
            aria-label="Ocultar a lista de chats"
            title="Ocultar a lista de chats"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </nav>
      ) : (
        <button
          type="button"
          onClick={() => showRail(true)}
          aria-label={unreadTotal ? `Abrir Messenger (${unreadTotal} não lidas)` : "Abrir Messenger"}
          title="Messenger"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow transition hover:scale-105 active:scale-95"
        >
          <MessageCircle className="h-6 w-6" />
          <Badge n={unreadTotal} className="absolute -right-0.5 -top-0.5 border-space-bg bg-orbit-pink" />
        </button>
      )}

      <div aria-live="polite" className="pointer-events-none fixed bottom-8 right-28 z-[90] flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "animate-pop-in flex max-w-sm items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl",
              t.tone === "error" ? "border-red-500/40 bg-space-surface/95 text-red-300" : "border-white/10 bg-space-surface/95 text-white"
            )}
          >
            {t.tone === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
            {t.text}
          </div>
        ))}
      </div>
    </MessengerContext.Provider>
  );
}

/** Painel "Chats": conversas (com prévia e não lidas) e a aba Contatos para começar uma conversa. */
function ChatList({
  chats,
  me,
  activeId,
  onOpen,
  onClose,
}: {
  chats: Conversation[];
  me: ChatUser;
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const { supabase, startDirect } = useMessenger();
  const [tab, setTab] = useState<"chats" | "contatos">("chats");
  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<ChatUser[] | null>(null);

  useEffect(() => {
    if (tab !== "contatos" || friends) return;
    loadFriends(supabase, me.id).then(setFriends, () => setFriends([]));
  }, [tab, friends, supabase, me.id]);

  const needle = q.trim().toLowerCase().replace(/^@/, "");
  const shownChats = needle
    ? chats.filter((c) => conversationTitle(c).toLowerCase().includes(needle) || (c.otherUser?.username ?? "").toLowerCase().includes(needle))
    : chats;
  const shownFriends = (friends ?? []).filter((f) => !needle || f.name.toLowerCase().includes(needle) || f.username.toLowerCase().includes(needle));

  return (
    <div
      role="dialog"
      aria-label="Chats"
      className="animate-pop-in fixed bottom-4 right-[92px] top-20 z-[41] flex w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-surface shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex gap-1 rounded-full bg-white/[0.05] p-0.5" role="tablist">
          {(["chats", "contatos"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={clsx("rounded-full px-3.5 py-1.5 text-sm font-semibold transition", tab === t ? "bg-chat text-snow" : "text-white/60 hover:text-white")}
            >
              {t === "chats" ? "Chats" : "Contatos"}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto py-1">
        {tab === "chats" ? (
          shownChats.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-white/40">{q ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda."}</p>
          ) : (
            shownChats.map((c) => {
              const title = conversationTitle(c);
              const last = c.lastMessage;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className={clsx("flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-white/[0.05]", activeId === c.id && "bg-chat/10")}
                >
                  <ConversationAvatar c={c} size={44} ringClass="border-space-surface" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={clsx("min-w-0 flex-1 truncate text-sm text-white", c.unread > 0 ? "font-semibold" : "font-medium")}>{title}</span>
                      {last && <span className="shrink-0 text-[10px] text-white/35">{formatTime(last.createdAt)}</span>}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={clsx("min-w-0 flex-1 truncate text-xs", c.unread > 0 ? "text-white/75" : "text-white/45")}>
                        {last ? (last.senderId === me.id ? "Você: " : "") + last.preview : "Sem mensagens ainda"}
                      </span>
                      <Badge n={c.unread} className="border-0" />
                    </span>
                  </span>
                </button>
              );
            })
          )
        ) : friends === null ? (
          <p className="px-4 py-10 text-center text-sm text-white/40">Carregando contatos…</p>
        ) : shownFriends.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-white/40">{q ? "Ninguém com esse nome." : "Seus amigos aparecem aqui."}</p>
        ) : (
          shownFriends.map((f) => (
            <button key={f.id} type="button" onClick={() => startDirect(f)} className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-white/[0.05]">
              <ChatAvatar name={f.name} url={f.avatarUrl} size={40} userId={f.id} presence={f.presence} frame={f.avatarFrame} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{f.name}</span>
                <span className="block truncate text-xs text-white/45">@{f.username}</span>
              </span>
              <MessageCircle className="h-4 w-4 shrink-0 text-white/35" />
            </button>
          ))
        )}
      </div>

      <label className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "chats" ? "Pesquisar conversa" : "Pesquisar contato"}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
      </label>
    </div>
  );
}
