"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Ban, Dices, Image as ImageIcon, Lock, Mic, Paperclip, Send, Smile, Trash2, UserMinus, Users, X } from "lucide-react";
import { formatDuration, messagePreview } from "@/lib/messenger/format";
import type { Attachment, ChatMessage, Member, SendStatus, StickerInfo } from "@/lib/messenger/types";
import { AttachmentMenu, type AttachmentChoice } from "./attachment-menu";
import { StickerPanel, type PanelTab } from "./sticker-panel";
import { ChatStickerStore } from "./chat-sticker-store";
import { ChatAvatar } from "./ui";
import { useMessenger } from "./context";
import { sendTyping } from "@/lib/messenger/typing";

/** Opção da lista que aparece ao digitar @ num grupo. */
type MentionOption = { handle: string; name: string; username: string | null; avatarUrl?: string | null; avatarFrame?: string | null; all?: boolean };

/** Detecta uma menção sendo digitada logo antes do cursor: "@" + trecho, no começo ou após espaço. */
function detectMention(value: string, caret: number): { query: string; start: number } | null {
  const upto = value.slice(0, caret);
  const m = upto.match(/(?:^|\s)@([a-zA-Z0-9_.]*)$/);
  if (!m) return null;
  return { query: m[1], start: caret - m[1].length - 1 };
}

const ALL_ALIASES = ["todos", "todas", "all", "geral", "everyone"];

export type ComposerApi = {
  text: (text: string) => void;
  media: (files: File[], caption: string) => void;
  files: (files: File[]) => void;
  music: (file: File) => void;
  voice: (blob: Blob, mime: string) => void;
  gif: (file: File) => void;
  gifReuse: (a: Attachment) => void;
  /** Adesivo criado pela própria pessoa (Meus adesivos). */
  personalSticker: (file: File) => void;
  sticker: (id: string, info?: StickerInfo | null) => void;
  openPoll: () => void;
  openLocation: () => void;
  openContact: () => void;
  openLink: () => void;
  openGift: () => void;
  openSave: () => void;
  /** Rola dados no servidor (grupos). Retorna ok=false com error quando o comando é inválido. */
  dice: (expr: string) => Promise<{ ok: boolean; error?: string }>;
};

const DICE = [
  { d: "d4", sides: 4 },
  { d: "d6", sides: 6 },
  { d: "d8", sides: 8 },
  { d: "d10", sides: 10 },
  { d: "d12", sides: 12 },
  { d: "d20", sides: 20 },
  { d: "d100", sides: 100 },
] as const;

const DICE_CMD = /^\/(?:r|roll)\s+(.+)$/i;

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
  isGroup = false,
  mentionMembers,
  meId,
  compact = false,
  allowMentionAll = true,
}: {
  /** "Menções em massa" restrita a administradores: @todos não aparece na lista. */
  allowMentionAll?: boolean;
  /** Janela pequena do chat flutuante: os painéis ocupam a largura toda. */
  compact?: boolean;
  conversationId: string;
  replyTo: ChatMessage | null;
  replyName: string | null;
  onCancelReply: () => void;
  api: ComposerApi;
  inSaved?: boolean;
  isGroup?: boolean;
  mentionMembers?: Member[];
  meId?: string;
}) {
  const { supabase, me } = useMessenger();
  const [text, setText] = useState(() => drafts.get(conversationId) ?? "");
  // Saiu da conversa (ou trocou de conversa) com o texto pela metade: para de mostrar "digitando".
  useEffect(() => () => sendTyping(supabase, conversationId, me, false), [supabase, conversationId, me]);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<null | PanelTab>(null);
  // Loja de adesivos aberta por cima da conversa (undefined = fechada; null = início da loja).
  const [store, setStore] = useState<string | null | undefined>(undefined);
  const [panelKey, setPanelKey] = useState(0);
  const [diceOpen, setDiceOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
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
    setMention(null);
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

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 4500);
    return () => clearTimeout(t);
  }, [hint]);

  const canSend = text.trim().length > 0 || pending.length > 0;

  // Lista que aparece ao digitar @ num grupo: "Todos" + membros que casam com o trecho.
  const mentionOptions = useMemo<MentionOption[]>(() => {
    if (!isGroup || !mention) return [];
    const q = mention.query.toLowerCase();
    const out: MentionOption[] = [];
    if (allowMentionAll && (q === "" || ALL_ALIASES.some((a) => a.startsWith(q)))) {
      out.push({ handle: "todos", name: "Todos do grupo", username: null, all: true });
    }
    for (const m of mentionMembers ?? []) {
      if (m.id === meId) continue;
      if (m.username.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) {
        out.push({ handle: m.username, name: m.name, username: m.username, avatarUrl: m.avatarUrl, avatarFrame: m.avatarFrame });
      }
      if (out.length >= 8) break;
    }
    return out.slice(0, 8);
  }, [isGroup, mention, mentionMembers, meId, allowMentionAll]);

  useEffect(() => setMentionIdx(0), [mention?.query, mention?.start]);

  function syncMention(el: HTMLTextAreaElement) {
    setMention(isGroup ? detectMention(el.value, el.selectionStart ?? el.value.length) : null);
  }

  function pickMention(opt: MentionOption) {
    const el = input.current;
    if (!el || !mention) return;
    const caret = el.selectionStart ?? text.length;
    const before = text.slice(0, mention.start);
    const after = text.slice(caret);
    const insert = `@${opt.handle} `;
    const next = before + insert + after;
    setText(next);
    setMention(null);
    const pos = before.length + insert.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function submit() {
    if (!inSaved) sendTyping(supabase, conversationId, me, false);
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
    // Comando de rolagem de dados (grupos): /r d20, /roll 2d10…
    const dm = t.match(DICE_CMD);
    if (dm) {
      if (!isGroup) {
        setHint("🎲 A rolagem de dados funciona só em grupos.");
        return;
      }
      void api.dice(dm[1].trim()).then((res) => {
        if (res.ok) {
          setText("");
          input.current?.focus();
        } else if (res.error === "invalid") {
          setHint("🎲 Comando de dado inválido. Disponíveis: D4, D6, D8, D10, D12, D20 e D100.");
        } else {
          setHint("🎲 Não foi possível rolar agora. Tente de novo.");
        }
      });
      return;
    }
    api.text(t.slice(0, 4000));
    setText("");
    input.current?.focus();
  }

  function rollFromSheet(d: string) {
    setDiceOpen(false);
    setText(`/r ${d}`);
    requestAnimationFrame(() => input.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Navegação na lista de menção (@) tem prioridade sobre enviar.
    if (mentionOptions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        pickMention(mentionOptions[mentionIdx] ?? mentionOptions[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
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

  // Tecla ⌫ do painel de emojis: apaga o caractere (ou emoji inteiro) antes do cursor.
  function backspace() {
    const el = input.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    let from = start;
    if (start === end) {
      if (start === 0) return;
      const before = text.slice(0, start);
      const parts = Array.from(new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(before));
      from = start - (parts[parts.length - 1]?.segment.length ?? 1);
    }
    setText(text.slice(0, from) + text.slice(end));
    requestAnimationFrame(() => el?.setSelectionRange(from, from));
  }

  const round = "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition active:scale-95 lg:h-11 lg:w-11";
  const photoInput = useRef<HTMLInputElement>(null);

  return (
    <div
      ref={wrap}
      className={clsx(
        "relative z-10 px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 md:px-4",
        panel && !compact && "max-md:pb-0",
        // Celular: flutua sobre o fundo da conversa (sem barra), como no app; computador: barra.
        compact ? "border-t border-white/10 bg-space-surface/80 backdrop-blur-xl" : "border-t border-white/[0.06] bg-[rgb(var(--chat-bar)/0.95)]"
      )}
    >
      {store !== undefined && (
        <ChatStickerStore
          initialPack={store}
          onClose={() => {
            setStore(undefined);
            // O painel recarrega os packs (um pack comprado/adicionado já aparece).
            setPanelKey((k) => k + 1);
          }}
        />
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

      {hint && (
        <p className="animate-pop-in mx-auto mb-2 max-w-3xl rounded-xl border border-orbit-purple/25 bg-orbit-purple/10 px-3 py-2 text-xs text-white/80">
          {hint}
        </p>
      )}

      {diceOpen && <DiceSheet onPick={rollFromSheet} onClose={() => setDiceOpen(false)} />}

      {mentionOptions.length > 0 && (
        <div className={clsx("animate-sheet-up absolute bottom-full left-2 right-2 mb-2", !compact && "md:left-auto md:right-4 md:w-[340px]")}>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-surface/95 py-1 shadow-2xl backdrop-blur-xl">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">Marcar no grupo</p>
            <div className="max-h-64 overflow-y-auto orbit-scrollbar">
              {mentionOptions.map((opt, i) => (
                <button
                  key={opt.all ? "@all" : opt.handle}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickMention(opt)}
                  onMouseEnter={() => setMentionIdx(i)}
                  className={clsx(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                    i === mentionIdx ? "bg-chat/15" : "hover:bg-white/5"
                  )}
                >
                  {opt.all ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chat/20 text-chat">
                      <Users className="h-[18px] w-[18px]" />
                    </span>
                  ) : (
                    <ChatAvatar name={opt.name} url={opt.avatarUrl} size={36} frame={opt.avatarFrame} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{opt.name}</span>
                    <span className="block truncate text-xs text-white/50">{opt.all ? "Notifica todos os membros" : `@${opt.username}`}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
                className={clsx(
                  round,
                  menuOpen ? "bg-chat/15 text-chat" : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Paperclip className="h-6 w-6 -rotate-45 lg:h-[22px] lg:w-[22px]" />
              </button>
              <AttachmentMenu open={menuOpen} onClose={() => setMenuOpen(false)} onChoose={choose} inSaved={inSaved} />
            </div>

            <div className="flex min-h-12 min-w-0 flex-1 items-end transition">
              <textarea
                ref={input}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (!inSaved) sendTyping(supabase, conversationId, me, e.target.value.trim().length > 0);
                  syncMention(e.target);
                }}
                onKeyDown={onKeyDown}
                onKeyUp={(e) => syncMention(e.currentTarget)}
                onClick={(e) => syncMention(e.currentTarget)}
                onBlur={() => setTimeout(() => setMention(null), 120)}
                onPaste={onPaste}
                rows={1}
                maxLength={4000}
                placeholder={pending.length ? "Adicione uma legenda..." : "Mensagem"}
                aria-label="Mensagem"
                className="orbit-scrollbar max-h-[148px] min-w-0 flex-1 resize-none bg-transparent py-[13px] pl-1 pr-1 text-[17px] caret-orbit-blue leading-snug text-white outline-none placeholder:text-white/45 lg:text-[16px]"
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
                  panel ? "text-chat" : "text-white/55 hover:text-white"
                )}
              >
                <Smile className="h-[23px] w-[23px]" />
              </button>
              {/* Atalho de foto/vídeo dentro do campo (como no app). */}
              {!text.trim() && !pending.length && (
                <>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      if (files.length) choose({ kind: "media", files });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoInput.current?.click()}
                    aria-label="Enviar foto ou vídeo"
                    title="Foto ou vídeo"
                    className="mb-0.5 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:text-white"
                  >
                    <ImageIcon className="h-[21px] w-[21px]" />
                  </button>
                </>
              )}
            </div>

            {isGroup && !canSend && (
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  setDiceOpen((v) => !v);
                }}
                aria-label="Rolar dados"
                title="Rolar dados"
                className={clsx(round, diceOpen ? "bg-chat/20 text-chat" : "border border-white/10 bg-white/[0.05] text-white/80 hover:border-chat/40 hover:text-white")}
              >
                <Dices className="h-5 w-5" />
              </button>
            )}

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
                className={clsx(round, "text-white/85 hover:bg-white/[0.06] hover:text-white")}
              >
                <Mic className="h-6 w-6 lg:h-[22px] lg:w-[22px]" />
              </button>
            )}
          </>
        )}
      </div>
      {panel && (
        // Celular: no lugar do teclado, logo abaixo do campo (como no VK); computador: janela acima.
        <div
          className={clsx(
            compact
              ? "animate-sheet-up absolute bottom-full left-0 right-0"
              : "animate-sheet-up -mx-2.5 mt-2.5 md:absolute md:bottom-full md:left-auto md:right-4 md:mx-0 md:mb-2 md:mt-0 md:w-[400px]"
          )}
        >
          <StickerPanel
            key={panelKey}
            initialTab={panel}
            onTabChange={(t) => (lastTab = t)}
            onClose={() => setPanel(null)}
            onEmoji={insertEmoji}
            onBackspace={backspace}
            onSticker={(id, info) => {
              setPanel(null);
              api.sticker(id, info);
            }}
            onGifFile={(f) => {
              setPanel(null);
              api.gif(f);
            }}
            onGifReuse={(a) => {
              setPanel(null);
              api.gifReuse(a);
            }}
            onPersonalSticker={(file) => {
              setPanel(null);
              api.personalSticker(file);
            }}
            onOpenStore={(packId) => setStore(packId ?? null)}
          />
        </div>
      )}

      {recording && elapsed > MAX_RECORD_SECONDS - 15 && (
        <p className="mt-1 text-center text-[11px] text-white/45">Limite de {MAX_RECORD_SECONDS / 60} minutos por áudio.</p>
      )}
      <span className="sr-only" aria-live="polite">
        {recording ? "Gravando" : ""}
      </span>
    </div>
  );
}

/** Seletor de dados (grupos): toca no dado e o comando /r dX vai para o campo de mensagem. */
function DiceSheet({ onPick, onClose }: { onPick: (d: string) => void; onClose: () => void }) {
  return (
    <div className="animate-sheet-up absolute bottom-full left-0 right-0 mb-2 md:left-auto md:right-4 md:w-[360px]">
      <div className="rounded-2xl border border-white/10 bg-space-surface/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Dices className="h-4 w-4 text-chat" /> Rolar dados
          </p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-white/50 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onPick("d20")}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-chat/50 bg-chat/10 py-2.5 text-sm font-semibold text-white"
        >
          <Dices className="h-4 w-4 text-chat" /> /r d20
        </button>
        <div className="grid grid-cols-3 gap-2">
          {DICE.filter((d) => d.d !== "d20").map((d) => (
            <button
              key={d.d}
              type="button"
              onClick={() => onPick(d.d)}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-white/85 transition hover:border-chat/40 hover:bg-white/[0.07]"
            >
              <span className="text-xs font-semibold">/r {d.d}</span>
              <span className="text-[10px] text-white/40">{d.sides} lados</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
