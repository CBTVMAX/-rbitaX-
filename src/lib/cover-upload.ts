import { createClient } from "@/lib/supabase/client";

/** Uploads an already-cropped cover (see CoverCropDialog) and saves it on the user. */
export async function saveCover(userId: string, blob: Blob): Promise<string> {
  const supabase = createClient();
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/cover/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (uploadError) throw uploadError;
  const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
  const { error: updateError } = await supabase.from("User").update({ coverUrl: pub.publicUrl }).eq("id", userId);
  if (updateError) throw updateError;
  return pub.publicUrl;
}
