import type { Attachment, MessageMeta, MessageType } from "./types";

/** Database timestamps come without a time zone (they are UTC). */
export function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  const trimmed = value.replace(/(\.\d{3})\d+/, "$1").replace(" ", "T");
  return new Date(/(Z|[+-]\d\d:?\d\d)$/.test(trimmed) ? trimmed : `${trimmed}Z`);
}

const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const longDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
const longDateYear = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatTime(value: string | Date) {
  return time.format(toDate(value));
}

/** Conversation list: "14:32", "Ontem", "seg.", "12/08/26". */
export function listTime(value: string | Date) {
  const d = toDate(value);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return time.format(d);
  if (days === 1) return "Ontem";
  if (days < 7) return weekday.format(d).replace(".", "");
  return shortDate.format(d);
}

/** Separator between days inside a chat. */
export function dayLabel(value: string | Date) {
  const d = toDate(value);
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  return d.getFullYear() === new Date().getFullYear() ? longDate.format(d) : longDateYear.format(d);
}

export function sameDay(a: string, b: string) {
  return startOfDay(toDate(a)) === startOfDay(toDate(b));
}

export function formatDuration(seconds: number | undefined | null) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export function formatBytes(bytes: number | undefined | null) {
  const b = bytes ?? 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(b < 10 * 1024 ? 1 : 0).replace(".", ",")} KB`;
  return `${(b / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Same wording as the database's message_preview() (list, notifications, replies). */
export function messagePreview(type: MessageType | string, content: string, meta: MessageMeta = {}, attachments: Attachment[] = []) {
  switch (type) {
    case "media": {
      const n = attachments.length;
      const base =
        n > 1
          ? attachments.some((a) => a.kind === "video")
            ? `🖼️ ${n} arquivos de mídia`
            : `📷 ${n} fotos`
          : attachments[0]?.kind === "video"
            ? "🎬 Vídeo"
            : "📷 Foto";
      return content.trim() ? `${base} · ${content}` : base;
    }
    case "file":
      return `📎 ${attachments[0]?.name ?? "Arquivo"}`;
    case "voice":
      return attachments[0]?.duration ? `🎙️ Áudio · ${formatDuration(attachments[0].duration)}` : "🎙️ Áudio";
    case "music":
      return `🎵 ${meta.title || attachments[0]?.name || "Música"}`;
    case "gif":
      return "GIF";
    case "sticker":
      return "Figurinha";
    case "location":
      return `📍 ${meta.label || "Localização"}`;
    case "contact":
      return `👤 Contato: ${meta.name ?? ""}`;
    case "poll":
      return `📊 ${meta.question ?? "Enquete"}`;
    case "gift":
      return `🎁 Presente: ${meta.giftName ?? "Presente"}`;
    default:
      return content;
  }
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\s)+$/u;

/** 1–3 emoji and nothing else: shown big, without a bubble. */
export function isEmojiOnly(text: string) {
  const t = text.trim();
  if (!t || !EMOJI_ONLY.test(t) || /^[\d#*\s]+$/.test(t)) return false;
  const compact = t.replace(/\s/g, "");
  const count =
    typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter("pt", { granularity: "grapheme" }).segment(compact)).length
      : Array.from(compact.replace(/[\u200d\ufe0f]/g, "")).length;
  return count <= 3;
}

export const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;
