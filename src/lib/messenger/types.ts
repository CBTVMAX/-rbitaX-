import { toDate } from "./format";

export type MessageType =
  | "text"
  | "media"
  | "file"
  | "voice"
  | "music"
  | "gif"
  | "sticker"
  | "location"
  | "contact"
  | "poll"
  | "system";

export type AttachmentKind = "image" | "video" | "file" | "audio";

/** A file stored in the private "chat" bucket: `${conversationId}/${senderId}/${uuid}.${ext}`. */
export type Attachment = {
  path: string;
  kind: AttachmentKind;
  name?: string;
  size?: number;
  mime?: string;
  width?: number;
  height?: number;
  /** Seconds (audio / video). */
  duration?: number;
  /** Poster frame of a video. */
  thumbPath?: string;
  /** 0–1 peaks for the voice message player. */
  waveform?: number[];
};

export type MessageMeta = {
  forwarded?: boolean;
  sticker?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  label?: string;
  userId?: string;
  name?: string;
  username?: string;
  avatarUrl?: string | null;
  question?: string;
  options?: string[];
  multiple?: boolean;
  title?: string;
  artist?: string;
  event?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachments: Attachment[];
  meta: MessageMeta;
  replyToId: string | null;
  deletedAt: string | null;
  deliveredAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  isRead: boolean;
  /** Client-only: still being uploaded/sent, or failed. */
  status?: "sending" | "failed";
  /** Client-only: object URLs to show uploads before they finish. */
  localUrls?: string[];
};

export type ChatUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  presence?: string | null;
  avatarFrame?: string | null;
  isVerified?: boolean;
};

export type LastMessage = {
  id: string;
  senderId: string;
  senderName: string | null;
  type: MessageType;
  preview: string;
  createdAt: string;
  deliveredAt: string | null;
  deleted: boolean;
};

export type SendStatus = "ok" | "not_member" | "not_friends" | "blocked";

export type Conversation = {
  id: string;
  isGroup: boolean;
  name: string | null;
  avatarUrl: string | null;
  description: string | null;
  memberCount: number;
  role: "owner" | "admin" | "member";
  archivedAt: string | null;
  mutedUntil: string | null;
  theme: string | null;
  messageTtlSeconds: number | null;
  othersReadAt: string | null;
  otherUser: ChatUser | null;
  lastMessage: LastMessage | null;
  unread: number;
  sortAt: string;
  sendStatus: SendStatus;
};

export type Member = ChatUser & { role: string; lastReadAt: string | null };

export type Reaction = { id: string; messageId: string; userId: string; emoji: string };
export type PollVote = { id: string; messageId: string; userId: string; optionIndex: number };

export const MESSAGE_COLUMNS =
  "id, conversationId, senderId, content, type, attachments, meta, replyToId, deletedAt, deliveredAt, expiresAt, createdAt, isRead" as const;

export function toMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    conversationId: row.conversationId as string,
    senderId: row.senderId as string,
    content: (row.content as string) ?? "",
    type: ((row.type as string) ?? "text") as MessageType,
    attachments: Array.isArray(row.attachments) ? (row.attachments as Attachment[]) : [],
    meta: (row.meta && typeof row.meta === "object" ? row.meta : {}) as MessageMeta,
    replyToId: (row.replyToId as string) ?? null,
    deletedAt: (row.deletedAt as string) ?? null,
    deliveredAt: (row.deliveredAt as string) ?? null,
    expiresAt: (row.expiresAt as string) ?? null,
    createdAt: row.createdAt as string,
    isRead: Boolean(row.isRead),
  };
}

export function isMuted(c: Pick<Conversation, "mutedUntil">) {
  return !!c.mutedUntil && toDate(c.mutedUntil) > new Date();
}

export function conversationTitle(c: Conversation) {
  return c.isGroup ? c.name ?? "Grupo" : c.otherUser?.name ?? "Conversa";
}
