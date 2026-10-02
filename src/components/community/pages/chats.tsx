"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLeft, Loader2, MessageSquareText, Plus, Send, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toMessage, MESSAGE_COLUMNS, type ChatMessage } from "@/lib/messenger/types";
import { messagePreview, formatTime } from "@/lib/messenger/format";
import { useCommunity } from "../context";
import { SubpageFrame } from "../subpage";

type Room = {
  id: string;
  name: string | null;
  createdById: string | null;
  memberCount: number;
  lastMessageAt: string | null;
  isMember: boolean;
  unread: number;
};

type Me = { id: string; name: string; username: string; avatarUrl: string | null };

/** "Bate-papos" da comunidade: salas de conversa entre os membros (pode abrir quantas quiser). */
export function CommunityChatsView({ communityId, isMember, me }: { communityId: string; isMember: boolean; me: Me | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // RPCs novas ainda não estão no database.types.ts gerado; o cast evita travar o build.
    const { data } = await supabase.rpc("community_chats" as never, { p_community: communityId } as never);
    setRooms((data ?? []) as unknown as Room[]);
    setLoading(false);
  }, [supabase, communityId]);

  useEffect(() => {
    if (isMember) load();
    else setLoading(false);
  }, [isMember, load]);

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("create_community_chat" as never, { p_community: communityId, p_name: name } as never);
    setBusy(false);
    if (e || !data) {
      setError(/rate/.test(e?.message ?? "") ? "Você criou muitos bate-papos agora há pouco. Aguarde um instante." : "Não foi possível criar o bate-papo.");
      return;
    }
    setCreating(false);
    setNewName("");
    await load();
    setActive({ id: data as unknown as string, name, createdById: me?.id ?? null, memberCount: 1, lastMessageAt: null, isMember: true, unread: 0 });
  }

  async function open(room: Room) {
    if (!room.isMember) {
      const { error: e } = await supabase.rpc("join_community_chat" as never, { p_conversation: room.id } as never);
      if (e) {
        setError("Não foi possível entrar neste bate-papo.");
        return;
      }
    }
    setActive({ ...room, isMember: true });
  }

  if (!isMember) {
    return (
      <SubpageFrame title="Bate-papos" icon={<MessageSquareText className="h-5 w-5" />}>
        <div className="rounded-2xl border border-white/10 bg-space-surface/70 p-8 text-center">
          <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-white/40" />
          <p className="text-sm text-white/70">Participe da comunidade para conversar nos bate-papos com os membros.</p>
        </div>
      </SubpageFrame>
    );
  }

  if (active && me) {
    return <ChatRoom room={active} me={me} supabase={supabase} onBack={() => { setActive(null); load(); }} />;
  }

  return (
    <SubpageFrame
      title="Bate-papos"
      icon={<MessageSquareText className="h-5 w-5" />}
      action={
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-3 py-2 text-xs font-semibold text-snow shadow-glow"
        >
          <Plus className="h-4 w-4" /> Criar
        </button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-space-surface/70 p-8 text-center">
          <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-white/40" />
          <p className="text-sm text-white/70">Nenhum bate-papo ainda. Crie o primeiro e chame a galera!</p>
          <button type="button" onClick={() => setCreating(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-orbit-gradient px-4 py-2 text-sm font-semibold text-snow shadow-glow">
            <Plus className="h-4 w-4" /> Criar bate-papo
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-space-surface/70">
          {rooms.map((r) => (
            <button key={r.id} type="button" onClick={() => open(r)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orbit-blue to-orbit-purple p-[1.5px]">
                <span className="flex h-full w-full items-center justify-center rounded-[14px] bg-space-card text-white">
                  <MessageSquareText className="h-5 w-5" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-white">{r.name || "Bate-papo"}</span>
                <span className="flex items-center gap-1 text-xs text-white/50"><Users className="h-3 w-3" /> {r.memberCount} {r.memberCount === 1 ? "membro" : "membros"}</span>
              </span>
              {r.unread > 0 && <span className="shrink-0 rounded-full bg-chat px-1.5 py-0.5 text-[10px] font-bold text-snow">{r.unread > 99 ? "99+" : r.unread}</span>}
              {!r.isMember && <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/70">Entrar</span>}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && setCreating(false)} />
          <div className="animate-sheet-up relative w-full max-w-md rounded-t-3xl border border-white/10 bg-space-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold text-white">Novo bate-papo</p>
              <button type="button" onClick={() => setCreating(false)} aria-label="Fechar" className="rounded-full p-1.5 text-white/55 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              maxLength={60}
              placeholder="Nome do bate-papo (ex.: Geral, Jogos…)"
              className="w-full rounded-2xl border border-white/10 bg-space-bg/50 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <button
              type="button"
              onClick={create}
              disabled={busy || !newName.trim()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar e abrir
            </button>
          </div>
        </div>
      )}
    </SubpageFrame>
  );
}

/** Uma sala aberta: mensagens + envio de texto, em tempo real (mesma base do Messenger). */
function ChatRoom({ room, me, supabase, onBack }: { room: Room; me: Me; supabase: ReturnType<typeof createClient>; onBack: () => void }) {
  const { community } = useCommunity();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const bodyRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("Message").select(MESSAGE_COLUMNS).eq("conversationId", room.id).order("createdAt", { ascending: false }).limit(40);
      if (!active) return;
      const rows = ((data as Record<string, unknown>[]) ?? []).map(toMessage).reverse();
      setMessages(rows);
      setLoading(false);
      scrollDown();
      supabase.rpc("mark_conversation_read", { conversation_id: room.id });
      // Nomes dos autores (para grupos)
      const ids = Array.from(new Set(rows.map((m) => m.senderId)));
      if (ids.length) {
        const { data: users } = await supabase.from("User").select("id, name").in("id", ids);
        if (active && users) setNames(Object.fromEntries(users.map((u) => [u.id, u.name])));
      }
    })();

    const channel = supabase
      .channel(`commroom:${room.id}:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message", filter: `conversationId=eq.${room.id}` }, async (payload) => {
        const m = toMessage(payload.new as Record<string, unknown>);
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.senderId !== me.id) supabase.rpc("mark_conversation_read", { conversation_id: room.id });
        if (!names[m.senderId]) {
          const { data: u } = await supabase.from("User").select("id, name").eq("id", m.senderId).maybeSingle();
          if (u) setNames((n) => ({ ...n, [u.id]: u.name }));
        }
        scrollDown();
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, room.id, me.id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    const id = crypto.randomUUID();
    const optimistic = toMessage({ id, conversationId: room.id, senderId: me.id, content: body, type: "text", attachments: [], meta: {}, createdAt: new Date().toISOString(), isRead: false });
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    scrollDown();
    const { error } = await supabase.from("Message").insert({ id, conversationId: room.id, senderId: me.id, content: body, type: "text" });
    if (error) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col md:h-[calc(100vh-4.5rem)]">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Voltar aos bate-papos" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80 hover:bg-white/5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orbit-blue to-orbit-purple p-[1.5px]">
          <span className="flex h-full w-full items-center justify-center rounded-[13px] bg-space-card text-white"><MessageSquareText className="h-5 w-5" /></span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{room.name || "Bate-papo"}</p>
          <p className="truncate text-xs text-white/45">{community.name}</p>
        </div>
      </header>

      <div ref={bodyRef} className="chat-space-bg flex-1 space-y-1.5 overflow-y-auto orbit-scrollbar px-3 py-3">
        {loading ? (
          <p className="py-8 text-center text-xs text-white/40">Carregando…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-white/40">Comece a conversa 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === me.id;
            const body = m.type === "text" ? m.content : messagePreview(m.type, m.content, m.meta, m.attachments);
            return (
              <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                <span className={clsx("max-w-[80%] rounded-2xl px-3 py-1.5 text-sm", mine ? "bg-chat-bubble text-snow" : "bg-white/[0.08] text-white/90")}>
                  {!mine && <span className="mb-0.5 block text-[11px] font-semibold text-chat">{names[m.senderId] ?? "Membro"}</span>}
                  <span className="whitespace-pre-wrap break-words">{body}</span>
                  <span className={clsx("ml-2 align-bottom text-[10px]", mine ? "text-snow/70" : "text-white/40")}>{formatTime(m.createdAt)}</span>
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-white/10 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
          placeholder="Mensagem para o grupo…"
          className="max-h-28 min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-chat/60"
        />
        <button type="button" onClick={send} disabled={!text.trim()} aria-label="Enviar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chat-bubble text-snow transition disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
