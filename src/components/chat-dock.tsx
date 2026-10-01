"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  ArrowLeft,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  PanelRightClose,
  Paperclip,
  Phone,
  Search,
  Send,
  Square,
  SquareArrowOutUpRight,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { conversationTitle, toMessage, MESSAGE_COLUMNS, type ChatMessage, type ChatUser, type Conversation } from "@/lib/messenger/types";
import { messagePreview, formatTime } from "@/lib/messenger/format";
import { chatFilePath, uploadChatFile, uploadMime, voiceWaveform, MAX_UPLOAD_BYTES } from "@/lib/messenger/media";
import { saveFilesToSaved } from "@/lib/messenger/saved";
import { useCalls } from "@/components/calls/call-provider";

const PANEL_KEY = "orbitax:chat-panel-open";

/** Só conversas normais (não os "Salvos"). */
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
 * Messenger do computador como painel lateral retrátil. Fechado, fica só o botão com o total
 * de não lidas; aberto, mostra conversas, busca e a conversa escolhida — sem sair do perfil ou
 * do feed. Reaproveita os dados do Messenger (RPC my_conversations, tabela Message, realtime e
 * o mesmo envio de arquivos). No celular não aparece: lá o Messenger é uma página própria.
 */
export function ChatDock({ me }: { me: ChatUser }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [desktop, setDesktop] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    try {
      setOpen(localStorage.getItem(PANEL_KEY) === "1");
    } catch {
      // storage indisponível: começa fechado
    }
    return () => mq.removeEventListener("change", on);
  }, []);

  const setPanel = useCallback((next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(PANEL_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setPanel]);

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

  // No próprio Messenger o painel não aparece (evita duplicar a conversa).
  if (!desktop || pathname.startsWith("/mensagens")) return null;

  const list = conversations.filter(isReal);
  const unreadTotal = list.reduce((n, c) => n + (c.unread || 0), 0);
  const active = activeId ? conversations.find((x) => x.id === activeId) ?? null : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setPanel(true)}
        aria-label={unreadTotal ? `Abrir Messenger (${unreadTotal} não lidas)` : "Abrir Messenger"}
        title="Messenger"
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow transition hover:scale-105 active:scale-95 md:flex"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-space-bg bg-orbit-pink px-1 text-[10px] font-bold text-snow">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside
      aria-label="Messenger"
      className="fixed bottom-0 right-0 top-16 z-40 hidden w-[360px] flex-col border-l border-white/10 bg-space-surface/95 shadow-[-24px_0_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex"
    >
      {active ? (
        <ChatPane key={active.id} me={me} conversation={active} supabase={supabase} onBack={() => setActiveId(null)} onCollapse={() => setPanel(false)} />
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <MessageCircle className="h-5 w-5 text-chat" />
            <span className="text-sm font-semibold text-white">Messenger</span>
            {unreadTotal > 0 && (
              <span className="rounded-full bg-chat px-1.5 py-0.5 text-[10px] font-bold text-snow">{unreadTotal > 99 ? "99+" : unreadTotal}</span>
            )}
            <Link href="/mensagens" title="Abrir o Messenger completo" aria-label="Abrir o Messenger completo" className="ml-auto rounded-full p-1.5 text-white/55 hover:bg-white/10 hover:text-white">
              <SquareArrowOutUpRight className="h-4 w-4" />
            </Link>
            <button type="button" onClick={() => setPanel(false)} title="Recolher" aria-label="Recolher o Messenger" className="rounded-full p-1.5 text-white/55 hover:bg-white/10 hover:text-white">
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
          <ConversationsPanel list={list} me={me} onOpen={setActiveId} />
        </>
      )}
    </aside>
  );
}

function ConversationsPanel({ list, me, onOpen }: { list: Conversation[]; me: ChatUser; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? list.filter((c) => conversationTitle(c).toLowerCase().includes(q.toLowerCase()) || (c.otherUser?.username ?? "").toLowerCase().includes(q.replace(/^@/, "").toLowerCase()))
    : list;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative p-3">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar conversa"
          className="w-full rounded-xl border border-white/10 bg-space-bg/60 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-chat/60"
        />
      </div>
      <div className="orbit-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/40">{q ? "Nenhuma conversa encontrada." : "Nenhuma conversa ainda."}</p>
        ) : (
          filtered.map((c) => {
            const title = conversationTitle(c);
            const last = c.lastMessage;
            return (
              <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5">
                <Avatar name={title} url={c.isGroup ? c.avatarUrl : c.otherUser?.avatarUrl ?? null} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={clsx("min-w-0 flex-1 truncate text-sm text-white", c.unread > 0 ? "font-semibold" : "font-medium")}>{title}</span>
                    {last && <span className="shrink-0 text-[10px] text-white/35">{formatTime(last.createdAt)}</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={clsx("min-w-0 flex-1 truncate text-xs", c.unread > 0 ? "text-white/75" : "text-white/45")}>
                      {last ? (last.senderId === me.id ? "Você: " : "") + last.preview : "Sem mensagens ainda"}
                    </span>
                    {c.unread > 0 && (
                      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-chat px-1 text-[10px] font-bold text-snow">{c.unread > 99 ? "99+" : c.unread}</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

type SB = ReturnType<typeof createClient>;

function ChatPane({
  me,
  conversation,
  supabase,
  onBack,
  onCollapse,
}: {
  me: ChatUser;
  conversation: Conversation;
  supabase: SB;
  onBack: () => void;
  onCollapse: () => void;
}) {
  const c = conversation;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [attachOpen, setAttachOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const gifInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const title = conversationTitle(c);
  const avatar = c.isGroup ? c.avatarUrl : c.otherUser?.avatarUrl ?? null;
  const messengerHref = `/mensagens?c=${encodeURIComponent(c.id)}`;

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2600);
  }, []);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("Message").select(MESSAGE_COLUMNS).eq("conversationId", c.id).order("createdAt", { ascending: false }).limit(40);
      if (!alive) return;
      setMessages(((data as Record<string, unknown>[]) ?? []).map(toMessage).reverse());
      setLoading(false);
      scrollDown();
      supabase.rpc("mark_conversation_read", { conversation_id: c.id });
    })();

    const channel = supabase
      .channel(`chatpane:${c.id}:${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message", filter: `conversationId=eq.${c.id}` }, (payload) => {
        const m = toMessage(payload.new as Record<string, unknown>);
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.senderId !== me.id) supabase.rpc("mark_conversation_read", { conversation_id: c.id });
        scrollDown();
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
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

  // Foto, vídeo, GIF e arquivo usam o mesmo envio do Messenger (compressão, pôster, tipos aceitos).
  async function sendFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setAttachOpen(false);
    if (!files.length) return;
    if (files.some((f) => f.size > MAX_UPLOAD_BYTES)) return flash("Cada arquivo pode ter no máximo 50 MB.");
    setBusy(true);
    const ok = await saveFilesToSaved(supabase, c.id, me.id, files);
    setBusy(false);
    if (ok < files.length) flash(ok ? "Alguns arquivos não puderam ser enviados." : "Não foi possível enviar.");
  }

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (ev) => ev.data.size && chunks.current.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1200) return; // toque acidental
        setBusy(true);
        try {
          const mime = uploadMime(blob.type);
          const { duration, waveform } = await voiceWaveform(blob);
          const ext = mime === "audio/mp4" ? "m4a" : mime === "audio/ogg" ? "ogg" : "webm";
          const path = chatFilePath(c.id, me.id, ext);
          await uploadChatFile(path, blob, mime);
          const { error } = await supabase.from("Message").insert({
            id: crypto.randomUUID(),
            conversationId: c.id,
            senderId: me.id,
            content: "",
            type: "voice",
            attachments: [{ path, kind: "audio", size: blob.size, mime, duration: Math.round(duration * 10) / 10, waveform }] as never,
            meta: {} as never,
          });
          if (error) throw error;
        } catch {
          flash("Não foi possível enviar o áudio.");
        }
        setBusy(false);
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      flash("Permita o uso do microfone para gravar áudio.");
    }
  }

  const { startCall } = useCalls();
  const call = (kind: "voice" | "video") => () => {
    const other = c.otherUser;
    if (c.isGroup || !other) return flash("Chamadas em grupo chegam em breve ao ÓrbitaX.");
    startCall({ conversationId: c.id, peer: { id: other.id, name: other.name, username: other.username, avatarUrl: other.avatarUrl }, kind });
  };
  const locked = c.sendStatus !== "ok";
  const iconBtn = "rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white";
  const attachItem = "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-white/85 hover:bg-white/5";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-2.5">
        <button type="button" onClick={onBack} aria-label="Voltar às conversas" className={iconBtn}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar name={title} url={avatar} size={34} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{title}</span>
        <button type="button" onClick={call("voice")} aria-label="Chamada de voz" title="Chamada de voz" className={iconBtn}>
          <Phone className="h-4 w-4" />
        </button>
        <button type="button" onClick={call("video")} aria-label="Chamada de vídeo" title="Chamada de vídeo" className={iconBtn}>
          <Video className="h-4 w-4" />
        </button>
        <Link href={messengerHref} aria-label="Abrir no Messenger" title="Abrir no Messenger" className={iconBtn}>
          <SquareArrowOutUpRight className="h-4 w-4" />
        </Link>
        <button type="button" onClick={onCollapse} aria-label="Recolher o Messenger" title="Recolher" className={iconBtn}>
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div ref={bodyRef} className="chat-space-bg orbit-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
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
                <span className={clsx("max-w-[80%] rounded-2xl px-3 py-1.5 text-sm", mine ? "bg-chat-bubble text-snow" : "bg-white/[0.08] text-white/90")}>
                  <span className="whitespace-pre-wrap break-words">{body}</span>
                  <span className={clsx("ml-2 align-bottom text-[10px]", mine ? "text-snow/70" : "text-white/40")}>{formatTime(m.createdAt)}</span>
                </span>
              </div>
            );
          })
        )}
      </div>

      {notice && <p className="border-t border-white/10 bg-white/[0.03] px-3 py-2 text-center text-xs text-white/70">{notice}</p>}

      {locked ? (
        <p className="border-t border-white/10 px-3 py-3 text-center text-xs text-white/50">
          Conversa indisponível.{" "}
          <Link href={messengerHref} className="text-chat hover:underline">
            Abrir no Messenger
          </Link>
        </p>
      ) : (
        <div className="relative flex items-end gap-1.5 border-t border-white/10 p-2.5">
          <button
            type="button"
            onClick={() => setAttachOpen((v) => !v)}
            disabled={busy || recording}
            aria-label="Anexar"
            aria-expanded={attachOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          {attachOpen && (
            <div className="absolute bottom-14 left-2.5 z-10 w-48 overflow-hidden rounded-xl border border-white/10 bg-space-surface py-1 shadow-2xl">
              <button type="button" className={attachItem} onClick={() => mediaInput.current?.click()}>
                <ImageIcon className="h-4 w-4" /> Foto ou vídeo
              </button>
              <button type="button" className={attachItem} onClick={() => gifInput.current?.click()}>
                <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-current text-[8px] font-bold">GIF</span> GIF
              </button>
              <button type="button" className={attachItem} onClick={() => fileInput.current?.click()}>
                <FileIcon className="h-4 w-4" /> Arquivo
              </button>
            </div>
          )}
          <input ref={mediaInput} type="file" accept="image/*,video/*" multiple hidden onChange={sendFiles} />
          <input ref={gifInput} type="file" accept="image/gif" hidden onChange={sendFiles} />
          <input ref={fileInput} type="file" multiple hidden onChange={sendFiles} />

          {recording ? (
            <span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-orbit-pink/40 bg-orbit-pink/10 px-3 text-sm text-white/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orbit-pink" /> Gravando áudio…
            </span>
          ) : (
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
              className="max-h-28 min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-chat/60"
            />
          )}

          {text.trim() && !recording ? (
            <button type="button" onClick={send} aria-label="Enviar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chat-bubble text-snow transition">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={busy}
              aria-label={recording ? "Parar e enviar áudio" : "Gravar áudio"}
              title={recording ? "Parar e enviar" : "Gravar áudio"}
              className={clsx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40",
                recording ? "bg-orbit-pink text-snow" : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              {recording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
