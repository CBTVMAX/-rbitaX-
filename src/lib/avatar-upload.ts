import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aspectMarker } from "@/lib/avatar-aspect";

/**
 * Uploads an already-edited avatar (see AvatarEditor) and returns its public URL. The aspect ratio
 * and the chosen frame mode are encoded in the file name (`<uuid>_3x4_follow.webp`) so every
 * consumer of the URL can recover them without a database column. Old uploads keep their own name
 * and simply fall back to the defaults.
 */
export async function uploadAvatarFile(
  supabase: SupabaseClient,
  userId: string,
  blob: Blob,
  ratio: number
): Promise<string> {
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar/${crypto.randomUUID()}_${aspectMarker(ratio)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (uploadError) throw uploadError;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** Points the user's avatar at an already-uploaded file. The URL already carries ratio and mode. */
export async function saveAvatarUrl(supabase: SupabaseClient, userId: string, publicUrl: string): Promise<string> {
  const { error } = await supabase.from("User").update({ avatarUrl: publicUrl }).eq("id", userId);
  if (error) throw error;
  return publicUrl;
}

/** Upload + save in one step, for the settings screens. */
export async function saveAvatar(userId: string, blob: Blob, ratio: number): Promise<string> {
  const supabase = createClient();
  const url = await uploadAvatarFile(supabase, userId, blob, ratio);
  return saveAvatarUrl(supabase, userId, url);
}
