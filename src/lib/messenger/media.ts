"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Chat files live in the private "chat" bucket. The database only lets members of the
 * conversation read them, and only while the message exists, so the app asks for short-lived
 * signed links in batches and keeps them in memory.
 */
export const CHAT_BUCKET = "chat";
const TTL_SECONDS = 6 * 60 * 60;

type Entry = { url: string; expires: number };
const cache = new Map<string, Entry>();
const failed = new Set<string>();
const listeners = new Set<() => void>();
const queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function fresh(path: string) {
  const e = cache.get(path);
  return e && e.expires > Date.now() ? e.url : undefined;
}

async function flush() {
  timer = null;
  const batch = Array.from(queue);
  queue.clear();
  if (!batch.length) return;
  const supabase = createClient();
  for (let i = 0; i < batch.length; i += 100) {
    const slice = batch.slice(i, i + 100);
    const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrls(slice, TTL_SECONDS);
    const now = Date.now();
    slice.forEach((path) => {
      const row = data?.find((d) => d.path === path);
      if (row?.signedUrl) cache.set(path, { url: row.signedUrl, expires: now + (TTL_SECONDS - 120) * 1000 });
      else failed.add(path);
    });
  }
  notify();
}

export function requestSignedUrls(paths: (string | undefined | null)[]) {
  let added = false;
  for (const p of paths) {
    if (!p || fresh(p) || failed.has(p) || queue.has(p)) continue;
    queue.add(p);
    added = true;
  }
  if (added && !timer) timer = setTimeout(flush, 30);
}

/** Show a file the person just picked while it uploads (and afterwards, without refetching). */
export function registerLocalUrl(path: string, objectUrl: string) {
  cache.set(path, { url: objectUrl, expires: Date.now() + 24 * 60 * 60 * 1000 });
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Signed URL for a chat file (undefined while loading, "" if it can no longer be opened). */
export function useSignedUrl(path: string | undefined | null) {
  useEffect(() => {
    if (path) requestSignedUrls([path]);
  }, [path]);
  return useSyncExternalStore(
    subscribe,
    () => (path ? fresh(path) ?? (failed.has(path) ? "" : undefined) : undefined),
    () => undefined
  );
}

export async function downloadUrl(path: string, name?: string) {
  const { data } = await createClient()
    .storage.from(CHAT_BUCKET)
    .createSignedUrl(path, 120, { download: name || true });
  return data?.signedUrl ?? null;
}

// ── Uploads ─────────────────────────────────────────────────────────────────

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/flac",
  "application/pdf", "application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "application/vnd.rar",
  "application/x-7z-compressed", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet",
  "application/rtf", "text/plain", "text/csv", "application/json", "application/epub+zip", "application/octet-stream",
]);

/** Content type accepted by the bucket (unknown types travel as a generic file). */
export function uploadMime(type: string | undefined) {
  const clean = (type ?? "").split(";")[0].trim().toLowerCase();
  if (clean === "audio/mp3") return "audio/mpeg";
  return ALLOWED_MIME.has(clean) ? clean : "application/octet-stream";
}

export function extensionOf(name: string | undefined, mime: string) {
  const fromName = name?.includes(".") ? name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  if (fromName) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4",
    "video/webm": "webm", "video/quicktime": "mov", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3",
    "audio/mp4": "m4a", "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}

export function chatFilePath(conversationId: string, userId: string, ext: string) {
  return `${conversationId}/${userId}/${crypto.randomUUID()}.${ext}`;
}

export async function uploadChatFile(path: string, blob: Blob, contentType: string) {
  const { error } = await createClient()
    .storage.from(CHAT_BUCKET)
    .upload(path, blob, { contentType, cacheControl: "31536000", upsert: false });
  if (error) throw error;
}

/** Forwarding / reusing a file in another conversation copies it into the sender's folder there. */
export async function copyChatFile(from: string, to: string) {
  const { error } = await createClient().storage.from(CHAT_BUCKET).copy(from, to);
  if (error) throw error;
}

export async function removeChatFiles(paths: string[]) {
  if (paths.length) await createClient().storage.from(CHAT_BUCKET).remove(paths);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Photos: fixes rotation, limits to 2048 px and re-encodes (WebP, or JPEG where unsupported). GIFs stay as they are. */
export async function compressImage(file: File): Promise<{ blob: Blob; mime: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const { width, height } = bitmap;
  if (file.type === "image/gif") {
    bitmap.close();
    return { blob: file, mime: "image/gif", width, height };
  }
  const scale = Math.min(1, 2048 / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  let blob = await canvasToBlob(canvas, "image/webp", 0.85);
  let mime = "image/webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
    mime = "image/jpeg";
  }
  if (!blob) throw new Error("image");
  // Already small and light: keep the original.
  if (scale === 1 && blob.size > file.size && ALLOWED_MIME.has(file.type)) return { blob: file, mime: file.type, width, height };
  return { blob, mime, width: w, height: h };
}

/** Duration, size and a poster frame for a video. */
export function videoInfo(file: Blob): Promise<{ duration: number; width: number; height: number; poster: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;
    const finish = (poster: Blob | null) => {
      if (done) return;
      done = true;
      const result = {
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
        poster,
      };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timeout = setTimeout(() => finish(null), 8000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 3);
    };
    video.onseeked = async () => {
      clearTimeout(timeout);
      const scale = Math.min(1, 720 / Math.max(video.videoWidth || 1, video.videoHeight || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      try {
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
        const poster = (await canvasToBlob(canvas, "image/webp", 0.8)) ?? (await canvasToBlob(canvas, "image/jpeg", 0.8));
        finish(poster);
      } catch {
        finish(null);
      }
    };
    video.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };
    video.src = url;
  });
}

/** Length of an audio file (music), read from its metadata. */
export function audioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    setTimeout(() => done(audio.duration || 0), 6000);
    audio.src = url;
  });
}

/** Voice messages: duration + 48 peaks for the waveform. */
export async function voiceWaveform(blob: Blob, bars = 48): Promise<{ duration: number; waveform: number[] }> {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    ctx.close();
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / bars));
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      let max = 0;
      for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16) max = Math.max(max, Math.abs(data[j]));
      peaks.push(max);
    }
    const top = Math.max(...peaks, 0.01);
    return { duration: buffer.duration, waveform: peaks.map((p) => Math.round(Math.max(0.08, p / top) * 100) / 100) };
  } catch {
    return { duration: 0, waveform: [] };
  }
}
