import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aspectMarker } from "@/lib/avatar-aspect";

const AVATAR_BUCKET = "chat";

/**
 * Uploads an already-edited avatar (see AvatarEditor) and returns its public URL.
 */
export async function uploadAvatarFile(
  supabase: SupabaseClient,
  userId: string,
  blob: Blob,
  ratio: number
): Promise<string> {
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar/${crypto.randomUUID()}_${aspectMarker(ratio)}.${ext}`;

  // Upload with upsert since we want to replace existing avatars
  const { error, data } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      cacheControl: "31536000",
      upsert: true
    });

  if (error) throw error;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Points the user's avatar at an already-uploaded file. */
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
