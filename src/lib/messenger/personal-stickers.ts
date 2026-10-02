import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sniffFile } from "@/lib/upload-guard";

/**
 * "Meus adesivos": GIFs e fotos que a própria pessoa transformou em adesivo. Ficam guardados na
 * conta (bucket público "media", pasta <id>/stickers/), aparecem no painel de adesivos em qualquer
 * aparelho e vão para a conversa como um GIF marcado `personalSticker` (desenhado sem balão, como
 * um adesivo). GIF continua animado; foto vira um WebP leve de até 512 px, com transparência.
 */
type Client = SupabaseClient<Database>;

export type PersonalSticker = { name: string; path: string; url: string; animated: boolean };

const BUCKET = "media";
export const PERSONAL_STICKER_MAX_BYTES = 8 * 1024 * 1024;
const MAX_STICKERS = 120;

const folder = (userId: string) => `${userId}/stickers`;

function publicUrl(supabase: Client, path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

let cache: { userId: string; list: Promise<PersonalSticker[]> } | null = null;

export function loadPersonalStickers(supabase: Client, userId: string) {
  if (!cache || cache.userId !== userId) {
    const list = Promise.resolve(
      supabase.storage.from(BUCKET).list(folder(userId), { limit: MAX_STICKERS, sortBy: { column: "created_at", order: "desc" } })
    ).then(({ data, error }) => {
      if (error) throw error;
      return (data ?? [])
        .filter((f) => /\.(gif|webp|png)$/i.test(f.name))
        .map((f) => {
          const path = `${folder(userId)}/${f.name}`;
          return { name: f.name, path, url: publicUrl(supabase, path), animated: /\.gif$/i.test(f.name) };
        });
    });
    list.catch(() => (cache = null));
    cache = { userId, list };
  }
  return cache.list;
}

async function toStillSticker(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  return blob;
}

/** Transforma um GIF (ou foto) em adesivo e guarda na conta. */
export async function addPersonalSticker(supabase: Client, userId: string, file: Blob): Promise<PersonalSticker> {
  const found = await sniffFile(file);
  if (!found || found.kind !== "image") throw new Error("Escolha um GIF ou uma imagem (PNG, JPG ou WebP).");
  const animated = found.mime === "image/gif";
  if (animated && file.size > PERSONAL_STICKER_MAX_BYTES) throw new Error("Esse GIF é muito grande. O limite para adesivo é 8 MB.");
  const blob = animated ? file : await toStillSticker(file);
  const current = await loadPersonalStickers(supabase, userId).catch(() => [] as PersonalSticker[]);
  if (current.length >= MAX_STICKERS) throw new Error(`Você já tem ${MAX_STICKERS} adesivos seus. Apague algum para criar outro.`);

  const name = `${crypto.randomUUID()}.${animated ? "gif" : "webp"}`;
  const path = `${folder(userId)}/${name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: animated ? "image/gif" : "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw new Error("Não foi possível salvar o adesivo agora.");
  const sticker = { name, path, url: publicUrl(supabase, path), animated };
  cache = { userId, list: Promise.resolve([sticker, ...current]) };
  return sticker;
}

export async function removePersonalSticker(supabase: Client, userId: string, sticker: PersonalSticker) {
  if (!sticker.path.startsWith(`${folder(userId)}/`)) return;
  const { error } = await supabase.storage.from(BUCKET).remove([sticker.path]);
  if (error) throw new Error("Não foi possível apagar o adesivo agora.");
  const current = await loadPersonalStickers(supabase, userId).catch(() => [] as PersonalSticker[]);
  cache = { userId, list: Promise.resolve(current.filter((s) => s.path !== sticker.path)) };
}

/** O arquivo do adesivo, pronto para enviar na conversa. */
export async function personalStickerFile(sticker: PersonalSticker): Promise<File> {
  const res = await fetch(sticker.url);
  if (!res.ok) throw new Error("Esse adesivo não está mais disponível.");
  const blob = await res.blob();
  return new File([blob], sticker.name, { type: sticker.animated ? "image/gif" : "image/webp" });
}
