"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Film } from "lucide-react";

export function VideoComposer({ userId }: { userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);

    try {
      const postId = crypto.randomUUID();
      const { error: postError } = await supabase.from("Post").insert({
        id: postId,
        authorId: userId,
        content: caption.trim(),
        kind: "video",
        updatedAt: new Date().toISOString(),
      });
      if (postError) throw postError;

      const ext = file.name.split(".").pop();
      const path = `${userId}/videos/${postId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const { error: mediaError } = await supabase.from("Media").insert({
        id: crypto.randomUUID(),
        postId,
        type: "video",
        url: pub.publicUrl,
        mimeType: file.type,
      });
      if (mediaError) throw mediaError;

      setCaption("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o vídeo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-2xl border border-white/10 bg-space-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Film className="h-4 w-4" /> Enviar vídeo
      </p>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Escreva uma legenda..."
        className="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
      />
      <input
        ref={fileRef}
        required
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-xs text-white/60"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy || !file}
        className="mt-3 rounded-full bg-orbit-gradient px-5 py-2 text-sm font-semibold text-snow shadow-glow disabled:opacity-50"
      >
        {busy ? "Enviando..." : "Publicar vídeo"}
      </button>
    </form>
  );
}
