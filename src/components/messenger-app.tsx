"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { timeAgo } from "@/lib/format";
import { ArrowLeft, Search, Send, X } from "lucide-react";
import { PresenceDot, PresenceStatus } from "@/components/presence-picker";
import { PRESENCE, presenceOf } from "@/lib/presence";
import { clsx } from "clsx";

export type ConversationSummary = {
  id: string;
  otherUser: { id: string; name: string; username: string; avatarUrl: string | null; presence?: string } | null;
  lastMessage: { content: string; createdAt: string } | null;
};

type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type UserResult = { id: string; name: string; username: string; avatarUrl: string | null; presence: string };

export function MessengerApp({
  currentUserId,
  currentUserName,
  currentUserPresence,
  initialConversations,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserPresence: string;
  initialConversations: ConversationSummary[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;

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

    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message", filter: `conversationId=eq.${activeId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageRow]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("User")
        .select("id, name, username, avatarUrl, presence")
        .ilike("username", `%${query.trim()}%`)
        .neq("id", currentUserId)
        .limit(8);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, searchOpen, supabase, currentUserId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeId) return;
    setText("");
    await supabase.from("Message").insert({
      id: crypto.randomUUID(),
      conversationId: activeId,
      senderId: currentUserId,
      content,
    });
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
    if (error || !conversationId) return;

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
            className="rounded-full bg-orbit-gradient p-2 text-white shadow-glow"
            title="Nova conversa"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <div className="orbit-scrollbar flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-6 text-center text-xs text-white/30">
              Nenhuma conversa ainda. Toque na lupa para começar.
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
                <p className="truncate text-sm font-medium text-white">{c.otherUser?.name}</p>
                <p className="truncate text-xs text-white/40">
                  {c.lastMessage?.content ?? "Diga oi 👋"}
                </p>
              </div>
              {c.lastMessage && (
                <span className="shrink-0 text-[10px] text-white/30">{timeAgo(c.lastMessage.createdAt)}</span>
              )}
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
                        ? "bg-orbit-gradient text-white"
                        : "bg-white/10 text-white/90"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/10 p-4">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva uma mensagem..."
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-orbit-purple"
              />
              <button type="submit" className="rounded-full bg-orbit-gradient p-2.5 text-white shadow-glow">
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
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
                >
                  <Avatar name={u.name} url={u.avatarUrl} size={32} />
                  <div>
                    <p className="text-sm text-white">{u.name}</p>
                    <p className="text-xs text-white/40">@{u.username}</p>
                  </div>
                </button>
              ))}
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
