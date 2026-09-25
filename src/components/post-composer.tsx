"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import {
  ChevronDown,
  Globe,
  Image as ImageIcon,
  ListChecks,
  MapPin,
  MoreHorizontal,
  Music2,
  Smile,
  User,
  Video,
  X,
} from "lucide-react";

export function PostComposer({
  userId,
  name,
  avatarUrl,
  variant = "default",
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  variant?: "default" | "profile";
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

  if (variant === "profile") {
    const soon = "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/45 cursor-default";
    const action = "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/75 transition hover:bg-white/5 hover:text-white";

    return (
      <form id="composer" onSubmit={submit} className="scroll-mt-24 rounded-2xl border border-white/10 bg-space-surface/80 p-3 md:p-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-orbit-gradient p-[2px]">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-space-card md:h-11 md:w-11">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-orbit-blue/80" />
              )}
            </span>
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="O que você está pensando?"
            rows={1}
            className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-xs text-white md:px-4 md:text-sm outline-none placeholder:text-white/40 focus:border-orbit-purple/60 md:py-3"
          />
          <span
            title="Outras opções de privacidade em breve"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-space-bg/60 px-2.5 py-2.5 text-xs text-white/80 md:gap-1.5 md:px-3 md:py-3"
          >
            <Globe className="h-4 w-4" /> <span className="hidden sm:inline">Público</span> <ChevronDown className="h-3.5 w-3.5" />
          </span>
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
            <button type="button" onClick={clearFile} className="absolute -right-2 -top-2 rounded-full bg-black/80 p-1 text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-0.5 md:pl-14">
            <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pickFile} />
            <button type="button" onClick={() => fileRef.current?.click()} className={action}>
              <ImageIcon className="h-4 w-4" /> Foto
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={action}>
              <Video className="h-4 w-4" /> Vídeo
            </button>
            <span title="Em breve" className={soon}>
              <Music2 className="h-4 w-4" /> Música
            </span>
            <span title="Em breve" className={`${soon} hidden md:flex`}>
              <ListChecks className="h-4 w-4" /> Enquete
            </span>
            <span title="Em breve" className={`${soon} hidden md:flex`}>
              <Smile className="h-4 w-4" /> Sentimento
            </span>
            <span title="Em breve" className={`${soon} hidden lg:flex`}>
              <MapPin className="h-4 w-4" /> Localização
            </span>
            <span title="Em breve" className={soon}>
              <MoreHorizontal className="h-4 w-4" /> Mais
            </span>
          </div>
          <button
            type="submit"
            disabled={posting || (!content.trim() && !file)}
            className="hidden shrink-0 rounded-full bg-orbit-gradient px-7 py-2 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-60 md:block"
          >
            {posting ? "Publicando..." : "Publicar"}
          </button>
        </div>

        {(content.trim() || file) && (
          <button
            type="submit"
            disabled={posting}
            className="mt-3 w-full rounded-full bg-orbit-gradient py-2 text-sm font-semibold text-snow shadow-glow md:hidden"
          >
            {posting ? "Publicando..." : "Publicar"}
          </button>
        )}
      </form>
    );
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
          className="rounded-full bg-orbit-gradient px-5 py-1.5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-40"
        >
          {posting ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}
