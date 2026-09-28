"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyUpload } from "@/lib/upload-guard";
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

type MentionItem = { type: "user" | "community"; handle: string; name: string; avatar: string | null };

function MentionSuggestions({ items, onPick }: { items: MentionItem[]; onPick: (handle: string) => void }) {
  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-space-surface shadow-2xl">
      {items.map((it) => (
        <button
          key={it.type + it.handle}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(it.handle);
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-space-card text-xs text-white/70">
            {it.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              it.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white">{it.name}</span>
            <span className="block truncate text-xs text-white/45">@{it.handle}{it.type === "community" ? " · comunidade" : ""}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

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
  const [mentions, setMentions] = useState<MentionItem[]>([]);
  const mentionRange = useRef<{ start: number; end: number } | null>(null);
  const mentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scanMentions() {
    const el = taRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? content.length;
    const m = content.slice(0, pos).match(/(?:^|\s)@([a-zA-Z0-9_.]{1,30})$/);
    if (!m) {
      mentionRange.current = null;
      setMentions([]);
      return;
    }
    const q = m[1];
    mentionRange.current = { start: pos - q.length - 1, end: pos };
    if (mentionTimer.current) clearTimeout(mentionTimer.current);
    mentionTimer.current = setTimeout(() => searchMentions(q), 180);
  }

  async function searchMentions(q: string) {
    const [u, c] = await Promise.all([
      supabase.from("User").select("id, name, username, avatarUrl").or(`username.ilike.%${q}%,name.ilike.%${q}%`).limit(5),
      supabase.from("Community").select("id, name, username, slug, avatarUrl").or(`username.ilike.%${q}%,name.ilike.%${q}%,slug.ilike.%${q}%`).limit(4),
    ]);
    const users: MentionItem[] = (u.data ?? []).map((x) => ({ type: "user", handle: x.username, name: x.name, avatar: x.avatarUrl }));
    const comms: MentionItem[] = (c.data ?? []).map((x) => ({ type: "community", handle: x.username ?? x.slug, name: x.name, avatar: x.avatarUrl }));
    setMentions([...users, ...comms].slice(0, 8));
  }

  function pickMention(handle: string) {
    const r = mentionRange.current;
    if (!r) return;
    const next = content.slice(0, r.start) + "@" + handle + " " + content.slice(r.end);
    setContent(next);
    mentionRange.current = null;
    setMentions([]);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        const p = r.start + handle.length + 2;
        el.focus();
        el.setSelectionRange(p, p);
      }
    });
  }

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
      const postId = crypto.randomUUID();
      // Confirma o tipo real de cada arquivo antes de criar qualquer coisa (um "png" falso não passa).
      const verified: string[] = [];
      for (const f of files) {
        const mime = await verifyUpload(f.file, ["image", "video", "audio"]);
        verified.push(mime);
      }
      const hasImage = verified.some((m) => m.startsWith("image"));
      const hasVideo = verified.some((m) => m.startsWith("video"));
      const kind = files.length === 0 ? "text" : hasImage ? "image" : hasVideo ? "video" : "music";

      const { error: postError } = await supabase.from("Post").insert({
        id: postId,
        authorId: userId,
        content: content.trim(),
        kind,
        updatedAt: new Date().toISOString(),
      });
      if (postError) throw postError;

      // Sobe cada arquivo e grava a Media na ordem escolhida (position), para o carrossel/grade.
      for (let i = 0; i < files.length; i++) {
        const { file } = files[i];
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
            {mentions.length > 0 && <MentionSuggestions items={mentions} onPick={pickMention} />}
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
          <div className="flex flex-wrap items-center gap-0.5 md:pl-14">
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
          {mentions.length > 0 && <MentionSuggestions items={mentions} onPick={pickMention} />}
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
