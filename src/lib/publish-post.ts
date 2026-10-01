import { createClient } from "@/lib/supabase/client";
import { verifyUpload } from "@/lib/upload-guard";

export type PostVisibility = "public" | "followers" | "private";

/**
 * Cria uma publicação no perfil (texto + fotos/vídeos/música na ordem escolhida).
 * Usado pelo composer do feed/perfil e pelo editor "Novo post" do celular.
 */
export async function publishPost({
  userId,
  content,
  files,
  location = null,
  visibility = "public",
  publishAt = null,
}: {
  userId: string;
  content: string;
  files: File[];
  location?: string | null;
  visibility?: PostVisibility;
  /** Agendamento ("Quando publicar"). null = agora. */
  publishAt?: Date | null;
}) {
  const supabase = createClient();
  const postId = crypto.randomUUID();
  // Confirma o tipo real de cada arquivo antes de criar qualquer coisa (um "png" falso não passa).
  const verified: string[] = [];
  for (const f of files) verified.push(await verifyUpload(f, ["image", "video", "audio"]));
  const hasImage = verified.some((m) => m.startsWith("image"));
  const hasVideo = verified.some((m) => m.startsWith("video"));
  const kind = files.length === 0 ? "text" : hasImage ? "image" : hasVideo ? "video" : "music";

  const { error: postError } = await supabase.from("Post").insert({
    id: postId,
    authorId: userId,
    content: content.trim(),
    kind,
    location: location?.trim() || null,
    visibility,
    ...(publishAt ? { publishAt: publishAt.toISOString() } : {}),
    updatedAt: new Date().toISOString(),
  });
  if (postError) throw postError;

  // Sobe cada arquivo e grava a Media na ordem escolhida (position), para o carrossel/grade.
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const mime = verified[i];
    const mediaType = mime.startsWith("video") ? "video" : mime.startsWith("audio") ? "audio" : "image";
    const fallbackExt = mediaType === "video" ? "mp4" : mediaType === "audio" ? "mp3" : "jpg";
    const ext = file.name.split(".").pop() || fallbackExt;
    const path = `${userId}/posts/${postId}-${i}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true, contentType: mime });
    if (uploadError) throw uploadError;
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const { error: mediaError } = await supabase.from("Media").insert({
      id: crypto.randomUUID(),
      postId,
      type: mediaType,
      url: pub.publicUrl,
      mimeType: mime,
      position: i,
    });
    if (mediaError) throw mediaError;
  }
  return postId;
}
