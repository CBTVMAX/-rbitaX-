"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { timeAgo } from "@/lib/format";
import Link from "next/link";
import { ArrowLeft, Lock, MessageCircle, Search, Send, X } from "lucide-react";
import { PresenceDot, PresenceStatus } from "@/components/presence-picker";
import { CountBadge, useLiveCounts } from "@/components/live-activity";
import { PRESENCE, presenceOf } from "@/lib/presence";
import { clsx } from "clsx";

export type ConversationSummary = {
  id: string;
  otherUser: { id: string; name: string; username: string; avatarUrl: string | null; presence?: string } | null;
  lastMessage: { content: string; createdAt: string } | null;
  unread?: number;
};

type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type UserResult = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  presence: string;
  friendState?: string;
};

export function MessengerApp({
  currentUserId,
  currentUserName,
  currentUserPresence,
  initialConversations,
  initialActiveId = null,
  notice = null,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserPresence: string;
  initialConversations: ConversationSummary[];
  initialActiveId?: string | null;
  notice?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId ?? initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [mobileChatOpen, setMobileChatOpen] = useState(!!initialActiveId);
  const [banner, setBanner] = useState<string | null>(notice);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const mobileChatOpenRef = useRef(mobileChatOpen);
  mobileChatOpenRef.current = mobileChatOpen;
  // On phones the list and the chat are separate screens: only an open chat counts as read.
  const chatVisible = () => mobileChatOpenRef.current || window.matchMedia("(min-width: 768px)").matches;

  const { refresh: refreshCounts } = useLiveCounts();
  const markRead = useCallback(
    async (conversationId: string) => {
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
      await supabase.rpc("mark_conversation_read", { conversation_id: conversationId });
      refreshCounts(); // the menu counter clears as soon as the conversation is seen
    },
    [supabase, refreshCounts]
  );

  // Messages of the open conversation; opening it marks the other side's messages as read.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    supabase
      .from("Message")
      .select("id, conversationId, senderId, content, createdAt")
      .eq("conversationId", activeId)
      .order("createdAt", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setMessages(data ?? []);
      });
    if (chatVisible()) markRead(activeId);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, supabase, markRead]);

  useEffect(() => {
    if (mobileChatOpen && activeId) markRead(activeId);
  }, [mobileChatOpen, activeId, markRead]);

  // Every new message in any of my conversations (the database only delivers my own):
  // updates the open chat, the list order, the preview and the unread counters live.
  useEffect(() => {
    const channel = supabase
      .channel(`messenger:${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, async (payload) => {
        const m = payload.new as MessageRow;
        const mine = m.senderId === currentUserId;
        const isOpen = m.conversationId === activeRef.current && chatVisible();
        const isActive = m.conversationId === activeRef.current;

        if (isActive) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (!mine && document.visibilityState === "visible" && chatVisible()) markRead(m.conversationId);
        }

        const known = conversationsRef.current.some((c) => c.id === m.conversationId);
        setConversations((prev) => {
          if (!prev.some((c) => c.id === m.conversationId)) return prev;
          return prev
            .map((c) =>
              c.id === m.conversationId
                ? {
                    ...c,
                    lastMessage: { content: m.content, createdAt: m.createdAt },
                    unread: !mine && !isOpen ? (c.unread ?? 0) + 1 : c.unread ?? 0,
                  }
                : c
            )
            .sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""));
        });

        if (!known) {
          // A friend started a new conversation with me.
          const { data: members } = await supabase
            .from("ConversationMember")
            .select("user:User(id, name, username, avatarUrl, presence)")
            .eq("conversationId", m.conversationId)
            .neq("userId", currentUserId)
            .limit(1);
          const other = (members?.[0]?.user as unknown as ConversationSummary["otherUser"]) ?? null;
          if (!other) return;
          setConversations((prev) =>
            prev.some((c) => c.id === m.conversationId)
              ? prev
              : [
                  {
                    id: m.conversationId,
                    otherUser: other,
                    lastMessage: { content: m.content, createdAt: m.createdAt },
                    unread: mine ? 0 : 1,
                  },
                  ...prev,
                ]
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, currentUserId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      // Same global search as Explorar: by name or @, respecting privacy and blocks.
      const { data } = await supabase.rpc("search_profiles", { search_query: query, limit_count: 9 });
      setResults((data ?? []).filter((u) => u.id !== currentUserId).slice(0, 8));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, searchOpen, supabase, currentUserId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeId) return;
    setText("");
    setSendError(null);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("Message").insert({
      id,
      conversationId: activeId,
      senderId: currentUserId,
      content,
    });
    if (error) {
      // Friendship ended (or was never accepted): the database refuses the message.
      setText(content);
      setSendError("Não foi possível enviar. O chat é só entre amigos: confira se a amizade continua ativa.");
      return;
    }
    const createdAt = new Date().toISOString();
    setMessages((prev) =>
      prev.some((x) => x.id === id) ? prev : [...prev, { id, conversationId: activeId, senderId: currentUserId, content, createdAt }]
    );
    setConversations((prev) =>
      prev
        .map((c) => (c.id === activeId ? { ...c, lastMessage: { content, createdAt: new Date().toISOString() } } : c))
        .sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""))
    );
  }

  async function startConversation(user: UserResult) {
    const { data: conversationId, error } = await supabase.rpc("get_or_create_dm", {
      other_user_id: user.id,
    });
    if (error || !conversationId) {
      setBanner(`Você e ${user.name} ainda não são amigos. O chat é liberado quando o pedido de amizade for aceito.`);
      setSearchOpen(false);
      return;
    }

    setConversations((prev) => {
      if (prev.some((c) => c.id === conversationId)) return prev;
      return [{ id: conversationId, otherUser: user, lastMessage: null }, ...prev];
    });
    setActiveId(conversationId);
    setMobileChatOpen(true);
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] md:h-[calc(100vh-4rem)]">
      <div className={clsx("w-full flex-col border-r border-white/10 md:flex md:w-80", mobileChatOpen ? "hidden" : "flex")}>
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h1 className="font-display text-lg font-bold text-white">Mensagens</h1>
            <PresenceStatus userId={currentUserId} initial={currentUserPresence} editable className="mt-1" />
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-full bg-orbit-gradient p-2 text-snow shadow-glow"
            title="Nova conversa"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <div className="orbit-scrollbar flex-1 overflow-y-auto">
          {banner && (
            <div className="m-3 flex items-start gap-2 rounded-xl border border-orbit-purple/40 bg-orbit-purple/10 p-3 text-xs text-white/80">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orbit-purple" />
              <p className="flex-1">{banner}</p>
              <button type="button" onClick={() => setBanner(null)} aria-label="Fechar aviso" className="text-white/50 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {conversations.length === 0 && (
            <p className="p-6 text-center text-xs text-white/30">
              Nenhuma conversa ainda. Toque na lupa para conversar com seus amigos.
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setMobileChatOpen(true);
              }}
              className={clsx(
                "flex w-full items-center gap-3 border-b border-white/5 p-3 text-left transition",
                activeId === c.id ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              <span className="relative shrink-0">
                <Avatar name={c.otherUser?.name ?? "?"} url={c.otherUser?.avatarUrl ?? null} />
                <PresenceDot value={c.otherUser?.presence} className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-space-bg" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={clsx("truncate text-sm text-white", c.unread ? "font-bold" : "font-medium")}>{c.otherUser?.name}</p>
                <p className={clsx("truncate text-xs", c.unread ? "font-medium text-white/80" : "text-white/40")}>
                  {c.lastMessage?.content ?? "Diga oi 👋"}
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {c.lastMessage && <span className="text-[10px] text-white/30">{timeAgo(c.lastMessage.createdAt)}</span>}
                <CountBadge count={c.unread ?? 0} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={clsx("min-w-0 flex-1 flex-col md:flex", mobileChatOpen ? "flex" : "hidden")}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <button
                type="button"
                onClick={() => setMobileChatOpen(false)}
                aria-label="Voltar para conversas"
                className="-ml-1 rounded-full p-1.5 text-white/70 hover:bg-white/5 md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="relative shrink-0">
                <Avatar name={active.otherUser?.name ?? "?"} url={active.otherUser?.avatarUrl ?? null} />
                <PresenceDot value={active.otherUser?.presence} className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-space-bg" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{active.otherUser?.name}</p>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span className="truncate">@{active.otherUser?.username}</span>
                  <span>·</span>
                  <span className={PRESENCE[presenceOf(active.otherUser?.presence)].text}>
                    {PRESENCE[presenceOf(active.otherUser?.presence)].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="orbit-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={clsx("flex", m.senderId === currentUserId ? "justify-end" : "justify-start")}
                >
                  <div
                    className={clsx(
                      "max-w-xs rounded-2xl px-3.5 py-2 text-sm",
                      m.senderId === currentUserId
                        ? "bg-orbit-gradient text-snow"
                        : "bg-white/10 text-white/90"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {sendError && <p className="border-t border-white/10 px-4 pt-3 text-xs text-red-400">{sendError}</p>}
            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/10 p-4">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva uma mensagem..."
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-orbit-purple"
              />
              <button type="submit" className="rounded-full bg-orbit-gradient p-2.5 text-snow shadow-glow">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-white/30">
            Selecione uma conversa, {currentUserName.split(" ")[0]}.
          </div>
        )}
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/60 pt-24" onClick={() => setSearchOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-space-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por @usuario"
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-orbit-purple"
              />
              <button onClick={() => setSearchOpen(false)} className="rounded-full p-2 text-white/50 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {results.map((u) =>
                u.friendState === "friends" ? (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
                  >
                    <Avatar name={u.name} url={u.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{u.name}</p>
                      <p className="truncate text-xs text-white/40">@{u.username}</p>
                    </div>
                    <MessageCircle className="h-4 w-4 shrink-0 text-orbit-purple" />
                  </button>
                ) : (
                  <Link
                    key={u.id}
                    href={`/perfil/${u.username}`}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
                  >
                    <Avatar name={u.name} url={u.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{u.name}</p>
                      <p className="truncate text-xs text-white/40">@{u.username}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                      <Lock className="h-3 w-3" />
                      {u.friendState === "outgoing" ? "Pedido enviado" : u.friendState === "incoming" ? "Responder pedido" : "Adicionar amigo"}
                    </span>
                  </Link>
                )
              )}
              {query.trim().length >= 2 && results.length === 0 && (
                <p className="p-2 text-xs text-white/30">Ninguém encontrado.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
