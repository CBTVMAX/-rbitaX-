"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { publishPost } from "@/lib/publish-post";
import { MentionHint, MentionPanel, useMentionPicker } from "@/components/mentions";
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

/** Miniaturas das fotos/vídeos/áudios escolhidos, numeradas na ordem em que serão publicadas. */
function MediaThumbs({ files, onRemove }: { files: { url: string; kind: "image" | "video" | "audio" }[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((f, i) => (
        <div key={f.url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]">
          {f.kind === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={f.url} muted className="h-full w-full object-cover" />
          ) : f.kind === "audio" ? (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-chat">
              <Music2 className="h-6 w-6" />
              <span className="px-1 text-[9px] text-white/50">Música</span>
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.url} alt="" className="h-full w-full object-cover" />
          )}
          <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">{i + 1}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remover foto ${i + 1}`}
            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

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
  const audioRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string; kind: "image" | "video" | "audio" }[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mention = useMentionPicker(taRef, content, setContent);
  const scanMentions = mention.scan;

  const MAX_FILES = 10;

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    if (!chosen.length) return;
    const kindOf = (f: File): "image" | "video" | "audio" =>
      f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image";
    setFiles((prev) => [...prev, ...chosen.map((file) => ({ file, url: URL.createObjectURL(file), kind: kindOf(file) }))].slice(0, MAX_FILES));
    e.target.value = "";
  }

  function removeAt(i: number) {
    setFiles((prev) => {
      const target = prev[i];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, j) => j !== i);
    });
  }

  function clearFiles() {
    setFiles((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    setPosting(true);
    setError(null);

    try {
      await publishPost({ userId, content, files: files.map((f) => f.file) });

      setContent("");
      clearFiles();
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
      <form id="composer" onSubmit={submit} className="scroll-mt-[96px] rounded-2xl border border-white/10 bg-space-surface/80 p-3 md:p-4">
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
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={taRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                requestAnimationFrame(scanMentions);
              }}
              onKeyUp={scanMentions}
              onClick={scanMentions}
              placeholder="O que você está pensando?"
              rows={1}
              className="w-full resize-none rounded-xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-xs text-white md:px-4 md:text-sm outline-none placeholder:text-white/40 focus:border-orbit-purple/60 md:py-3"
            />
            {mention.open && <MentionPanel items={mention.items} onPick={mention.pick} floating />}
            <MentionHint value={content} className="mt-2" />
          </div>
          <span
            title="Outras opções de privacidade em breve"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-space-bg/60 px-2.5 py-2.5 text-xs text-white/80 md:gap-1.5 md:px-3 md:py-3"
          >
            <Globe className="h-4 w-4" /> <span className="hidden sm:inline">Público</span> <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </div>

        <MediaThumbs files={files} onRemove={removeAt} />

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-0.5 md:pl-[56px]">
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={pickFile} />
            <input ref={audioRef} type="file" accept="audio/*" multiple hidden onChange={pickFile} />
            <button type="button" onClick={() => fileRef.current?.click()} className={action}>
              <ImageIcon className="h-4 w-4" /> Foto
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={action}>
              <Video className="h-4 w-4" /> Vídeo
            </button>
            <button type="button" onClick={() => audioRef.current?.click()} className={action}>
              <Music2 className="h-4 w-4" /> Música
            </button>
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
            disabled={posting || (!content.trim() && files.length === 0)}
            className="hidden shrink-0 rounded-full bg-orbit-gradient px-7 py-2 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-60 md:block"
          >
            {posting ? "Publicando..." : "Publicar"}
          </button>
        </div>

        {(content.trim() || files.length > 0) && (
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
        <div className="relative w-full">
          <textarea
            ref={taRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              requestAnimationFrame(scanMentions);
            }}
            onKeyUp={scanMentions}
            onClick={scanMentions}
            placeholder={`No que você está pensando, ${name.split(" ")[0]}?`}
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          {mention.open && <MentionPanel items={mention.items} onPick={mention.pick} floating />}
          <MentionHint value={content} className="mt-2" />
        </div>
      </div>

      <MediaThumbs files={files} onRemove={removeAt} />

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={pickFile} />
          <input ref={audioRef} type="file" accept="audio/*" multiple hidden onChange={pickFile} />
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
          <button
            type="button"
            onClick={() => audioRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <Music2 className="h-4 w-4" /> Música
          </button>
        </div>
        <button
          type="submit"
          disabled={posting || (!content.trim() && files.length === 0)}
          className="rounded-full bg-orbit-gradient px-5 py-1.5 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-40"
        >
          {posting ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}
