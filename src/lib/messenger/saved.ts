import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  audioDuration,
  chatFilePath,
  compressImage,
  copyChatFile,
  extensionOf,
  MAX_UPLOAD_BYTES,
  removeChatFiles,
  uploadChatFile,
  uploadMime,
  videoInfo,
} from "./media";
import type { Attachment, ChatMessage, MessageType } from "./types";

/**
 * "Salvos" is the member's private conversation (Conversation.isSaved, only member = owner).
 * Saving a message keeps an independent copy: files are copied into the Salvos folder and the
 * database (save_to_saved) writes the message with its real origin, so it survives even if the
 * original is deleted or the person leaves that chat.
 */
type Client = SupabaseClient<Database>;

export async function ensureSavedId(supabase: Client) {
  const { data, error } = await supabase.rpc("ensure_saved_chat");
  if (error || !data) throw error ?? new Error("saved");
  return data as string;
}

export function canSave(m: ChatMessage) {
  return !m.deletedAt && !m.status && m.type !== "system" && m.type !== "gift";
}

export async function saveMessageToSaved(supabase: Client, savedId: string, meId: string, m: ChatMessage) {
  const copied: string[] = [];
  const next: { path: string; thumbPath?: string }[] = [];
  try {
    for (const a of m.attachments) {
      const path = chatFilePath(savedId, meId, a.path.split(".").pop() ?? "bin");
      await copyChatFile(a.path, path);
      copied.push(path);
      const item: { path: string; thumbPath?: string } = { path };
      if (a.thumbPath) {
        const thumb = chatFilePath(savedId, meId, a.thumbPath.split(".").pop() ?? "webp");
        try {
          await copyChatFile(a.thumbPath, thumb);
          copied.push(thumb);
          item.thumbPath = thumb;
        } catch {
          /* the poster is optional */
        }
      }
      next.push(item);
    }
    const { error } = await supabase.rpc("save_to_saved", { p_message_id: m.id, p_attachments: next as never });
    if (error) throw error;
  } catch (e) {
    if (copied.length) removeChatFiles(copied).catch(() => {});
    throw e;
  }
}

async function insert(supabase: Client, savedId: string, meId: string, type: MessageType, content: string, attachments: Attachment[], meta = {}) {
  const { error } = await supabase.from("Message").insert({
    id: crypto.randomUUID(),
    conversationId: savedId,
    senderId: meId,
    content,
    type,
    attachments: attachments as never,
    meta: meta as never,
  });
  if (error) throw error;
}

export async function saveNoteToSaved(supabase: Client, savedId: string, meId: string, text: string) {
  const t = text.trim().slice(0, 4000);
  if (t) await insert(supabase, savedId, meId, "text", t, []);
}

/** Photos/videos → media, audio → music card, anything else → document. Returns how many were saved. */
export async function saveFilesToSaved(supabase: Client, savedId: string, meId: string, files: File[]) {
  let ok = 0;
  for (const file of files.slice(0, 10)) {
    if (file.size > MAX_UPLOAD_BYTES) continue;
    try {
      if (file.type.startsWith("image/") && file.type !== "image/gif") {
        const img = await compressImage(file);
        const path = chatFilePath(savedId, meId, extensionOf(undefined, img.mime));
        await uploadChatFile(path, img.blob, img.mime);
        await insert(supabase, savedId, meId, "media", "", [
          { path, kind: "image", name: file.name, size: img.blob.size, mime: img.mime, width: img.width, height: img.height },
        ]);
      } else if (file.type.startsWith("video/")) {
        const info = await videoInfo(file);
        const mime = uploadMime(file.type);
        const path = chatFilePath(savedId, meId, extensionOf(file.name, mime));
        await uploadChatFile(path, file, mime);
        const a: Attachment = { path, kind: "video", name: file.name, size: file.size, mime, width: info.width, height: info.height, duration: Math.round(info.duration) };
        if (info.poster) {
          const thumbPath = chatFilePath(savedId, meId, info.poster.type === "image/webp" ? "webp" : "jpg");
          await uploadChatFile(thumbPath, info.poster, info.poster.type || "image/jpeg");
          a.thumbPath = thumbPath;
        }
        await insert(supabase, savedId, meId, "media", "", [a]);
      } else if (file.type.startsWith("audio/")) {
        const mime = uploadMime(file.type);
        const path = chatFilePath(savedId, meId, extensionOf(file.name, mime));
        const duration = await audioDuration(file);
        await uploadChatFile(path, file, mime);
        await insert(supabase, savedId, meId, "music", "", [{ path, kind: "audio", name: file.name.slice(0, 180), size: file.size, mime, duration: Math.round(duration) }], {
          title: file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").slice(0, 120),
        });
      } else {
        const mime = uploadMime(file.type);
        const path = chatFilePath(savedId, meId, extensionOf(file.name, mime));
        await uploadChatFile(path, file, mime);
        await insert(supabase, savedId, meId, "file", "", [{ path, kind: "file", name: file.name.slice(0, 180), size: file.size, mime }]);
      }
      ok++;
    } catch {
      /* counted by the caller */
    }
  }
  return ok;
}
