"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Ban, Keyboard, Lock, Mic, Plus, Send, Smile, Trash2, UserMinus, X } from "lucide-react";
import { formatDuration, messagePreview } from "@/lib/messenger/format";
import type { Attachment, ChatMessage, SendStatus } from "@/lib/messenger/types";
import { AttachmentMenu, type AttachmentChoice } from "./attachment-menu";
import { StickerPanel, type PanelTab } from "./sticker-panel";

export type ComposerApi = {
  text: (text: string) => void;
  media: (files: File[], caption: string) => void;
  files: (files: File[]) => void;
  music: (file: File) => void;
  voice: (blob: Blob, mime: string) => void;
  gif: (file: File) => void;
  gifReuse: (a: Attachment) => void;
  sticker: (id: string) => void;
  openPoll: () => void;
  openLocation: () => void;
  openContact: () => void;
  openLink: () => void;
  openGift: () => void;
  openSave: () => void;
};

const drafts = new Map<string, string>();
let lastTab: PanelTab = "stickers";
const MAX_RECORD_SECONDS = 5 * 60;

function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/** Shown instead of the input when this person can't write here, with the reason. */
export function ComposerLocked({ status, username, name }: { status: SendStatus; username?: string; name?: string }) {
  const content =
    status === "blocked"
      ? { icon: Ban, text: "Não é possível enviar mensagens nesta conversa porque há um bloqueio entre vocês." }
      : status === "not_member"
        ? { icon: UserMinus, text: "Você não faz mais parte desta conversa." }
        : {
            icon: Lock,
            text: `Você e ${name?.split(" ")[0] ?? "esta pessoa"} não são amigos no momento. O chat do ÓrbitaX é só entre amigos: envie um pedido de amizade para voltar a conversar.`,
          };
  const Icon = content.icon;
  return (
    <div className="border-t border-white/10 bg-space-surface/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/50" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/75">{content.text}</p>
          {status === "not_friends" && username && (
            <Link href={`/perfil/${username}`} className="mt-2 inline-block text-sm font-semibold text-chat hover:underline">
              Ir para o perfil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function MessageComposer({
  conversationId,
  replyTo,
  replyName,
  onCancelReply,
  api,
  inSaved = false,
}: {
  conversationId: string;
  replyTo: ChatMessage | null;
  replyName: string | null;
  onCancelReply: () => void;
  api: ComposerApi;
  inSaved?: boolean;
}) {
  const [text, setText] = useState(() => drafts.get(conversationId) ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<null | PanelTab>(null);
  const [pending, setPending] = useState<{ file: File; url: string }[]>([]);
  const [recording, setRecording] = useState<null | { started: number }>(null);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const discard = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(drafts.get(conversationId) ?? "");
    setPending([]);
    setPanel(null);
  }, [conversationId]);

  useEffect(() => {
    drafts.set(conversationId, text);
    const el = input.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
    }
  }, [text, conversationId]);

  useEffect(() => {
    if (replyTo) input.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    if (!panel) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [panel]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const s = (Date.now() - recording.started) / 1000;
      setElapsed(s);
      if (s >= MAX_RECORD_SECONDS) stopRecording(true);
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.url)), [pending]);

  const canSend = text.trim().length > 0 || pending.length > 0;

  function submit() {
    if (pending.length) {
      api.media(
        pending.map((p) => p.file),
        text.trim()
      );
      setPending([]);
      setText("");
      return;
    }
    const t = text.trim();
    if (!t) return;
    api.text(t.slice(0, 4000));
    setText("");
    input.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (files.length) {
      e.preventDefault();
      addPending(files);
    }
  }

  function addPending(files: File[]) {
    setPending((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 10));
  }

  function choose(c: AttachmentChoice) {
    switch (c.kind) {
      case "media":
      case "camera":
      case "video":
        addPending(c.files);
        break;
      case "file": {
        // Audio files get the compact player; anything else is a document.
        const audio = c.files.filter((f) => f.type.startsWith("audio/"));
        const docs = c.files.filter((f) => !f.type.startsWith("audio/"));
        audio.forEach(api.music);
        if (docs.length) api.files(docs);
        break;
      }
      case "gif":
        setPanel((lastTab = "gif"));
        break;
      case "sticker":
        setPanel((lastTab = "stickers"));
        break;
      case "link":
        api.openLink();
        break;
      case "gift":
        api.openGift();
        break;
      case "save":
        api.openSave();
        break;
      case "location":
        api.openLocation();
        break;
      case "contact":
        api.openContact();
        break;
      case "poll":
        api.openPoll();
        break;
      case "voice":
        startRecording();
        break;
    }
  }

  async function startRecording() {
    setMicError(null);
    const mime = pickRecorderMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Seu navegador não permite gravar áudio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48_000 } : undefined);
      chunks.current = [];
      discard.current = false;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
        const blob = new Blob(chunks.current, { type });
        if (!discard.current && blob.size > 800) api.voice(blob, type);
        setRecording(null);
        setElapsed(0);
      };
      rec.start(250);
      recorder.current = rec;
      setRecording({ started: Date.now() });
      navigator.vibrate?.(15);
    } catch {
      setMicError("Permita o uso do microfone para gravar mensagens de voz.");
    }
  }

  function stopRecording(send: boolean) {
    discard.current = !send;
    if (recorder.current?.state !== "inactive") recorder.current?.stop();
    recorder.current = null;
  }

  function insertEmoji(e: string) {
    const el = input.current;
    if (!el) {
      setText((t) => t + e);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + e + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + e.length, start + e.length);
    });
  }

  const round = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95";

  return (
    <div ref={wrap} className="relative z-10 border-t border-white/10 bg-space-surface/80 px-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl md:px-4">
      {panel && (
        <div className="animate-sheet-up absolute bottom-full left-0 right-0 md:bottom-full md:left-auto md:right-4 md:mb-2 md:w-[400px]">
          <StickerPanel
            initialTab={panel}
            onTabChange={(t) => (lastTab = t)}
            onClose={() => setPanel(null)}
            onEmoji={insertEmoji}
            onSticker={(id) => {
              setPanel(null);
              api.sticker(id);
            }}
            onGifFile={(f) => {
              setPanel(null);
              api.gif(f);
            }}
            onGifReuse={(a) => {
              setPanel(null);
              api.gifReuse(a);
            }}
          />
        </div>
      )}

      {replyTo && (
        <div className="animate-pop-in mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-2xl border-l-[3px] border-chat bg-white/[0.05] py-2 pl-3 pr-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-chat">Respondendo a {replyName ?? "mensagem"}</p>
            <p className="truncate text-xs text-white/60">
              {replyTo.deletedAt ? "Mensagem apagada" : messagePreview(replyTo.type, replyTo.content, replyTo.meta, replyTo.attachments)}
            </p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancelar resposta" className="rounded-full p-1.5 text-white/50 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="animate-pop-in mx-auto mb-2 flex max-w-3xl gap-2 overflow-x-auto pb-1">
          {pending.map((p, i) => (
            <div key={p.url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]">
              {p.file.type.startsWith("video/") ? (
                <video src={p.url} muted playsInline className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remover"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-snow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {micError && (
        <p className="mx-auto mb-2 flex max-w-3xl items-center justify-between rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {micError}
          <button type="button" onClick={() => setMicError(null)} aria-label="Fechar">
            <X className="h-3.5 w-3.5" />
          </button>
        </p>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-1.5 md:gap-2">
        {recording ? (
          <>
            <button type="button" onClick={() => stopRecording(false)} aria-label="Descartar gravação" className={clsx(round, "text-red-400 hover:bg-red-500/10")}>
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-red-500/30 bg-red-500/[0.08] px-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-mono text-sm tabular-nums text-white">{formatDuration(elapsed)}</span>
              <span className="truncate text-xs text-white/50">Gravando mensagem de voz…</span>
            </div>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              aria-label="Enviar mensagem de voz"
              className={clsx(round, "bg-chat-bubble text-snow shadow-glow")}
            >
              <Send className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Anexar"
                aria-expanded={menuOpen}
                className={clsx(round, menuOpen ? "rotate-45 bg-chat/20 text-chat" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1] hover:text-white")}
              >
                <Plus className="h-5 w-5 transition-transform" />
              </button>
              <AttachmentMenu open={menuOpen} onClose={() => setMenuOpen(false)} onChoose={choose} inSaved={inSaved} />
            </div>

            <div className="flex min-h-11 min-w-0 flex-1 items-end rounded-[22px] border border-white/10 bg-white/[0.05] transition focus-within:border-chat/60 focus-within:bg-white/[0.07]">
              <textarea
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                rows={1}
                maxLength={4000}
                placeholder={pending.length ? "Adicione uma legenda..." : "Escreva uma mensagem..."}
                aria-label="Mensagem"
                className="orbit-scrollbar max-h-[148px] min-w-0 flex-1 resize-none bg-transparent py-[11px] pl-4 pr-1 text-[15px] leading-snug text-white outline-none placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={() => {
                  if (panel) {
                    setPanel(null);
                    input.current?.focus();
                  } else {
                    input.current?.blur();
                    setPanel(lastTab);
                  }
                }}
                aria-label={panel ? "Voltar ao teclado" : "Stickers, emoji e GIF"}
                title={panel ? "Teclado" : "Stickers, emoji e GIF"}
                className={clsx(
                  "mb-0.5 mr-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
                  panel ? "bg-chat/15 text-chat" : "text-white/55 hover:text-white"
                )}
              >
                {panel ? <Keyboard className="h-[21px] w-[21px]" /> : <Smile className="h-[22px] w-[22px]" />}
              </button>
            </div>

            {canSend ? (
              <button
                type="button"
                onClick={submit}
                aria-label="Enviar"
                className={clsx(round, "animate-pop-in bg-chat-bubble text-snow shadow-[0_0_18px_rgb(var(--chat-accent,139_92_246)/0.45)]")}
              >
                <Send className="h-5 w-5 translate-x-[1px]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                aria-label="Gravar mensagem de voz"
                title="Gravar áudio"
                className={clsx(round, "border border-white/10 bg-white/[0.05] text-white/80 hover:border-chat/40 hover:text-white")}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>
      {recording && elapsed > MAX_RECORD_SECONDS - 15 && (
        <p className="mt-1 text-center text-[11px] text-white/45">Limite de {MAX_RECORD_SECONDS / 60} minutos por áudio.</p>
      )}
      <span className="sr-only" aria-live="polite">
        {recording ? "Gravando" : ""}
      </span>
    </div>
  );
}
