"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ChevronUp, MessageCircle, Minus, Search, Send, SquareArrowOutUpRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { conversationTitle, toMessage, MESSAGE_COLUMNS, type ChatMessage, type ChatUser, type Conversation } from "@/lib/messenger/types";
import { messagePreview, formatTime } from "@/lib/messenger/format";

/** Só conversas normais (não os "Salvos") e que a pessoa ainda pode ver. */
function isReal(c: Conversation) {
  return !c.isSaved;
}

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card text-xs font-semibold text-white/70">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        (name || "?").slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/**
 * Bate-papo do computador: um dock no canto inferior direito com a lista de conversas e
 * janelinhas de conversa, para conversar sem sair da página (sem abrir o Messenger inteiro).
 * Reaproveita os mesmos dados do Messenger (RPC my_conversations, tabela Message, realtime).
 * Aparece só no desktop; o celular continua usando o Messenger em tela cheia.
 */
export function ChatDock({ me }: { me: ChatUser }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [desktop, setDesktop] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [windows, setWindows] = useState<string[]>([]);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const reload = useCallback(async () => {
    const { data } = await supabase.rpc("my_conversations");
    if (data) setConversations((data as unknown as Conversation[]).map((r) => ({ ...r, isSaved: Boolean(r.isSaved), otherUser: r.otherUser ?? null, lastMessage: r.lastMessage ?? null })));
  }, [supabase]);

  useEffect(() => {
    if (!desktop) return;
    reload();
    const channel = supabase
      .channel(`chatdock:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(reload, 350);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [desktop, supabase, me.id, reload]);

  const open = useCallback((id: string) => {
    setWindows((prev) => (prev.includes(id) ? [...prev.filter((x) => x !== id), id] : [...prev, id]).slice(-3));
    setListOpen(false);
  }, []);
  const close = useCallback((id: string) => setWindows((prev) => prev.filter((x) => x !== id)), []);

  // No próprio Messenger o dock não aparece (evita duplicar a conversa).
  if (!desktop || pathname.startsWith("/mensagens")) return null;

  const list = conversations.filter(isReal);
  const unreadTotal = list.reduce((n, c) => n + (c.unread || 0), 0);

  return (
    <div className="fixed bottom-0 right-4 z-40 hidden items-end gap-3 md:flex">
      {windows.map((id) => {
        const c = conversations.find((x) => x.id === id);
        if (!c) return null;
        return <ChatWindow key={id} me={me} conversation={c} supabase={supabase} onClose={() => close(id)} />;
      })}

      <div className="flex w-72 flex-col overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-space-surface/95 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/5"
        >
          <MessageCircle className="h-5 w-5 text-chat" />
          Bate-papo
          {unreadTotal > 0 && (
            <span className="ml-1 rounded-full bg-chat px-1.5 py-0.5 text-[10px] font-bold text-snow">{unreadTotal > 99 ? "99+" : unreadTotal}</span>
          )}
          <ChevronUp className={clsx("ml-auto h-4 w-4 text-white/50 transition", listOpen && "rotate-180")} />
        </button>

        {listOpen && <ConversationsPanel list={list} me={me} onOpen={open} />}
      </div>
    </div>
  );
}

function ConversationsPanel({ list, me, onOpen }: { list: Conversation[]; me: ChatUser; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? list.filter((c) => conversationTitle(c).toLowerCase().includes(q.toLowerCase()) || (c.otherUser?.username ?? "").toLowerCase().includes(q.replace(/^@/, "").toLowerCase()))
    : list;

  return (
    <div className="border-t border-white/10">
      <div className="relative p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar conversa"
          className="w-full rounded-lg border border-white/10 bg-space-bg/60 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-chat/60"
        />
      </div>
      <div className="max-h-80 overflow-y-auto orbit-scrollbar pb-1">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-white/40">Nenhuma conversa ainda.</p>
        ) : (
          filtered.map((c) => {
            const title = conversationTitle(c);
            const last = c.lastMessage;
            return (
              <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5">
                <Avatar name={title} url={c.isGroup ? c.avatarUrl : c.otherUser?.avatarUrl ?? null} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{title}</span>
                    {c.unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-chat" />}
                  </span>
                  <span className="block truncate text-xs text-white/45">
                    {last ? (last.senderId === me.id ? "Você: " : "") + last.preview : "Sem mensagens ainda"}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      <Link href="/mensagens" className="block border-t border-white/10 px-4 py-2.5 text-center text-xs font-semibold text-chat hover:bg-white/5">
        Abrir o Messenger
      </Link>
    </div>
  );
}

type SB = ReturnType<typeof createClient>;

function ChatWindow({ me, conversation, supabase, onClose }: { me: ChatUser; conversation: Conversation; supabase: SB; onClose: () => void }) {
  const c = conversation;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const title = conversationTitle(c);
  const avatar = c.isGroup ? c.avatarUrl : c.otherUser?.avatarUrl ?? null;

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("Message").select(MESSAGE_COLUMNS).eq("conversationId", c.id).order("createdAt", { ascending: false }).limit(30);
      if (!active) return;
      const rows = ((data as Record<string, unknown>[]) ?? []).map(toMessage).reverse();
      setMessages(rows);
      setLoading(false);
      scrollDown();
      supabase.rpc("mark_conversation_read", { conversation_id: c.id });
    })();

    const channel = supabase
      .channel(`chatwin:${c.id}:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message", filter: `conversationId=eq.${c.id}` }, (payload) => {
        const m = toMessage(payload.new as Record<string, unknown>);
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.senderId !== me.id) supabase.rpc("mark_conversation_read", { conversation_id: c.id });
        scrollDown();
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, c.id, me.id, scrollDown]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    const id = crypto.randomUUID();
    const optimistic = toMessage({ id, conversationId: c.id, senderId: me.id, content: body, type: "text", attachments: [], meta: {}, createdAt: new Date().toISOString(), isRead: false });
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    scrollDown();
    const { error } = await supabase.from("Message").insert({ id, conversationId: c.id, senderId: me.id, content: body, type: "text" });
    if (error) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const locked = c.sendStatus !== "ok";

  return (
    <div className="flex h-[440px] w-80 flex-col overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-space-surface/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <Avatar name={title} url={avatar} size={32} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{title}</span>
        <Link href={`/mensagens?c=${encodeURIComponent(c.id)}`} aria-label="Abrir no Messenger" title="Abrir no Messenger" className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
          <SquareArrowOutUpRight className="h-4 w-4" />
        </Link>
        <button type="button" onClick={() => setMinimized((v) => !v)} aria-label="Minimizar" className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!minimized && (
        <>
          <div ref={bodyRef} className="chat-space-bg flex-1 space-y-1.5 overflow-y-auto orbit-scrollbar px-3 py-3">
            {loading ? (
              <p className="py-6 text-center text-xs text-white/40">Carregando…</p>
            ) : messages.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">Diga olá 👋</p>
            ) : (
              messages.map((m) => {
                const mine = m.senderId === me.id;
                const body = m.type === "text" ? m.content : messagePreview(m.type, m.content, m.meta, m.attachments);
                return (
                  <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                    <span
                      className={clsx(
                        "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm",
                        mine ? "bg-chat-bubble text-snow" : "bg-white/[0.08] text-white/90"
                      )}
                    >
                      {c.isGroup && !mine && <span className="mb-0.5 block text-[11px] font-semibold text-chat">{m.senderId.slice(0, 6)}</span>}
                      <span className="whitespace-pre-wrap break-words">{body}</span>
                      <span className={clsx("ml-2 align-bottom text-[10px]", mine ? "text-snow/70" : "text-white/40")}>{formatTime(m.createdAt)}</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {locked ? (
            <p className="border-t border-white/10 px-3 py-3 text-center text-xs text-white/50">
              Conversa indisponível.{" "}
              <Link href={`/mensagens?c=${encodeURIComponent(c.id)}`} className="text-chat hover:underline">
                Abrir no Messenger
              </Link>
            </p>
          ) : (
            <div className="flex items-end gap-2 border-t border-white/10 p-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder="Mensagem…"
                className="max-h-24 min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-chat/60"
              />
              <button
                type="button"
                onClick={send}
                disabled={!text.trim()}
                aria-label="Enviar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chat-bubble text-snow transition disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
