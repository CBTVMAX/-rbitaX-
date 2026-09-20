"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { Image as ImageIcon, Video, X } from "lucide-react";

export function PostComposer({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !file) return;
    setPosting(true);
    setError(null);

    try {
      const postId = crypto.randomUUID();
      const isVideo = file?.type.startsWith("video");

      const { error: postError } = await supabase.from("Post").insert({
        id: postId,
        authorId: userId,
        content: content.trim(),
        kind: file ? (isVideo ? "video" : "image") : "text",
        updatedAt: new Date().toISOString(),
      });
      if (postError) throw postError;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/posts/${postId}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
          upsert: true,
        });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
        const { error: mediaError } = await supabase.from("Media").insert({
          id: crypto.randomUUID(),
          postId,
          type: isVideo ? "video" : "image",
          url: pub.publicUrl,
          mimeType: file.type,
        });
        if (mediaError) throw mediaError;
      }

      setContent("");
      clearFile();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível publicar.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-2xl border border-white/10 bg-space-card p-4">
      <div className="flex gap-3">
        <Avatar name={name} url={avatarUrl} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`No que você está pensando, ${name.split(" ")[0]}?`}
          rows={2}
          className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>

      {preview && (
        <div className="relative mt-3 inline-block">
          {file?.type.startsWith("video") ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={preview} className="max-h-64 rounded-xl" controls />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-64 rounded-xl" />
          )}
          <button
            type="button"
            onClick={clearFile}
            className="absolute -right-2 -top-2 rounded-full bg-black/80 p-1 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pickFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <ImageIcon className="h-4 w-4" /> Foto
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <Video className="h-4 w-4" /> Vídeo
          </button>
        </div>
        <button
          type="submit"
          disabled={posting || (!content.trim() && !file)}
          className="rounded-full bg-orbit-gradient px-5 py-1.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40"
        >
          {posting ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}
