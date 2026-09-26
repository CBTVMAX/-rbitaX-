"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { BarChart3, Clapperboard, FileText, Film, Image as ImageIcon, Link2, Loader2, MessagesSquare, Music2, PenSquare, Plus, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/post-card";
import {
  ACCEPT,
  can,
  checkFile,
  communityError,
  rank,
  TAG_LABEL,
  uploadCommunityFile,
  type Album,
  type PostTag,
  type UploadKind,
} from "@/lib/communities";
import { useCommunity } from "./context";
import { Sheet } from "./ui";

export type CreateKind = "post" | "photo" | "video" | "clip" | "poll" | "discussion" | "music" | "file";

const OPTIONS: { kind: CreateKind; label: string; hint: string; emoji: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { kind: "post", label: "Publicação", hint: "Texto, link ou GIF", emoji: "📝", icon: PenSquare },
  { kind: "photo", label: "Foto", hint: "Uma ou várias", emoji: "📷", icon: ImageIcon },
  { kind: "video", label: "Vídeo", hint: "Até 50 MB", emoji: "🎥", icon: Film },
  { kind: "clip", label: "Clipe", hint: "Vertical 9:16", emoji: "🎬", icon: Clapperboard },
  { kind: "poll", label: "Enquete", hint: "2 a 10 opções", emoji: "📊", icon: BarChart3 },
  { kind: "discussion", label: "Discussão", hint: "Tópico com respostas", emoji: "💬", icon: MessagesSquare },
  { kind: "music", label: "Música", hint: "MP3, M4A, OGG", emoji: "🎵", icon: Music2 },
  { kind: "file", label: "Arquivo", hint: "PDF, TXT ou ZIP", emoji: "📎", icon: FileText },
];

/** Which create options this person has (mirrors the server rules; the server checks again). */
export function useCreateOptions() {
  const { community, role, viewer } = useCommunity();
  return useMemo(() => {
    if (!viewer) return [];
    const post = can(community, role, "post");
    return OPTIONS.filter((o) => {
      switch (o.kind) {
        case "post":
        case "music":
        case "file":
          return post;
        case "photo":
          return post && can(community, role, "photo");
        case "video":
        case "clip":
          return post && can(community, role, "video");
        case "poll":
          return post && can(community, role, "poll");
        case "discussion":
          return can(community, role, "discussion");
      }
    });
  }, [community, role, viewer]);
}

export function CreateMenu({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (k: CreateKind) => void }) {
  const options = useCreateOptions();
  return (
    <Sheet open={open} onClose={onClose} title="Criar na comunidade">
      {options.length === 0 ? (
        <p className="py-4 text-sm text-white/55">Você ainda não tem permissão para publicar aqui.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 pt-1 md:grid-cols-4">
          {options.map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => onPick(o.kind)}
              className="group flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-1 py-3 text-center transition hover:border-orbit-purple/40 hover:bg-orbit-purple/[0.06] active:scale-95"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgb(var(--app-accent,139_92_246)/0.35),rgb(var(--app-accent,139_92_246)/0.08))] text-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition group-hover:scale-105">
                {o.emoji}
              </span>
              <span className="text-[12px] font-semibold leading-tight text-white">{o.label}</span>
              <span className="hidden text-[10px] leading-tight text-white/40 min-[380px]:block">{o.hint}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

type Picked = { file: File; preview: string; kind: UploadKind };

export function Composer({
  kind,
  onClose,
  onCreated,
  albums = [],
  defaultAlbum = null,
  defaultTag = null,
}: {
  kind: CreateKind | null;
  onClose: () => void;
  onCreated: (result: { id: string; status: string; kind: CreateKind }) => void;
  albums?: Album[];
  defaultAlbum?: string | null;
  /** Pre-selects a tag (e.g. the announcement tool in Gerenciar). */
  defaultTag?: PostTag | null;
}) {
  const { supabase, community, viewer, role, toast } = useCommunity();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [files, setFiles] = useState<Picked[]>([]);
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [musicTitle, setMusicTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tag, setTag] = useState<PostTag | "">("");
  const [album, setAlbum] = useState<string>(defaultAlbum ?? "");
  const [comments, setComments] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText("");
    setTitle("");
    setLink("");
    setShowLink(false);
    setFiles((f) => (f.forEach((x) => URL.revokeObjectURL(x.preview)), []));
    setOptions(["", ""]);
    setMultiple(false);
    setMusicTitle("");
    setArtist("");
    setTag(defaultTag ?? "");
    setAlbum(defaultAlbum ?? "");
    setComments(true);
    setError(null);
    setProgress("");
  }, [kind, defaultAlbum, defaultTag]);

  if (!kind || !viewer) return null;
  const meta = OPTIONS.find((o) => o.kind === kind)!;
  const uploadKind: UploadKind | null =
    kind === "photo" || kind === "post" || kind === "discussion" ? "image" : kind === "video" || kind === "clip" ? "video" : kind === "music" ? "audio" : kind === "file" ? "file" : null;
  const maxFiles = kind === "photo" || kind === "post" ? 10 : 1;
  const admin = rank(role) >= 3;
  const canLink = can(community, role, "link") && !(community.moderation.blockLinks && rank(role) < 2);

  function pick(list: FileList | null) {
    if (!list || !uploadKind) return;
    const next: Picked[] = [];
    for (const f of Array.from(list)) {
      const problem = checkFile(f, uploadKind);
      if (problem) {
        setError(problem);
        continue;
      }
      next.push({ file: f, preview: URL.createObjectURL(f), kind: uploadKind });
    }
    setFiles((cur) => [...cur, ...next].slice(0, maxFiles));
    if (next.length) setError(null);
  }

  async function submit() {
    if (!viewer || !kind) return;
    setError(null);
    if (kind === "discussion" && title.trim().length < 3) return setError("Dê um título com pelo menos 3 caracteres.");
    if (kind === "poll" && (text.trim().length < 1 || options.filter((o) => o.trim()).length < 2)) return setError("A enquete precisa de uma pergunta e pelo menos 2 opções.");
    if (["photo", "video", "clip", "music", "file"].includes(kind) && files.length === 0) return setError("Escolha o arquivo antes de publicar.");
    if (kind === "post" && !text.trim() && files.length === 0 && !link.trim()) return setError("Escreva algo ou adicione uma mídia.");
    setBusy(true);
    try {
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(files.length > 1 ? `Enviando ${i + 1} de ${files.length}…` : "Enviando arquivo…");
        uploaded.push(await uploadCommunityFile(supabase, viewer.id, community.id, files[i].file, files[i].kind));
      }
      setProgress("Publicando…");
      if (kind === "discussion") {
        const { data, error: e } = await supabase.rpc("community_create_discussion", {
          p_community: community.id,
          p_title: title.trim(),
          p_body: text.trim(),
          p_image: uploaded[0]?.url ?? null,
        });
        if (e) throw new Error(communityError(e.message));
        const r = data as { id: string; status: string };
        onCreated({ ...r, kind });
      } else {
        const postKind = kind === "post" ? (uploaded.length ? "image" : link.trim() ? "link" : "text") : kind === "photo" ? "image" : kind;
        const payload: Record<string, unknown> = {
          kind: postKind,
          content: kind === "poll" ? "" : text,
          commentsEnabled: comments,
          media: uploaded.map((u) => ({ type: u.type, url: u.url, width: u.width, height: u.height, sizeBytes: u.sizeBytes, mimeType: u.mimeType })),
        };
        if (link.trim()) payload.linkUrl = /^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`;
        if (kind === "poll") payload.poll = { question: text.trim(), options: options.map((o) => o.trim()).filter(Boolean), multiple };
        if (kind === "music") payload.music = { title: musicTitle.trim() || files[0]?.file.name.replace(/\.[^.]+$/, "") || "Áudio", artist: artist.trim() };
        if (tag) payload.tag = tag;
        if (album && postKind === "image") payload.albumId = album;
        const { data, error: e } = await supabase.rpc("community_create_post", { p_community: community.id, p: payload as never });
        if (e) throw new Error(communityError(e.message));
        const r = data as { id: string; status: string };
        onCreated({ ...r, kind });
      }
      toast("Publicado!");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar agora.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

  return (
    <Sheet
      open={!!kind}
      onClose={() => !busy && onClose()}
      wide
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden>{meta.emoji}</span> {kind === "discussion" ? "Nova discussão" : `Nova ${meta.label.toLowerCase()}`}
        </span>
      }
      footer={
        <div className="flex items-center gap-2">
          {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <p className="min-w-0 flex-1 truncate text-xs text-white/45">{progress || `em ${community.name}`}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publicar
          </button>
        </div>
      }
    >
      <div className="flex gap-3 pt-1">
        <Avatar name={viewer.name} url={viewer.avatarUrl} size={40} />
        <div className="min-w-0 flex-1 space-y-3">
          {kind === "discussion" && (
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Título da discussão" className={clsx(field, "font-semibold")} autoFocus />
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={kind === "poll" ? 200 : 5000}
            rows={kind === "poll" ? 2 : 4}
            autoFocus={kind !== "discussion"}
            placeholder={
              kind === "poll"
                ? "Pergunta da enquete"
                : kind === "discussion"
                  ? "Descreva o tópico (opcional)"
                  : kind === "clip"
                    ? "Legenda do clipe"
                    : `Compartilhe com ${community.name}…`
            }
            className={clsx(field, "resize-none leading-relaxed")}
          />

          {kind === "poll" && (
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={(e) => setOptions((l) => l.map((x, k) => (k === i ? e.target.value : x)))}
                    maxLength={100}
                    placeholder={`Opção ${i + 1}`}
                    className={field}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions((l) => l.filter((_, k) => k !== i))} aria-label="Remover opção" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/5">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button type="button" onClick={() => setOptions((l) => [...l, ""])} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-orbit-cyan hover:bg-orbit-cyan/10">
                  <Plus className="h-4 w-4" /> Adicionar opção
                </button>
              )}
              <label className="flex items-center gap-2 text-sm text-white/75">
                <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--app-accent,139_92_246))]" />
                Permitir várias respostas
              </label>
            </div>
          )}

          {kind === "music" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} maxLength={120} placeholder="Nome da música" className={field} />
              <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} placeholder="Artista (opcional)" className={field} />
            </div>
          )}

          {uploadKind && (
            <>
              <input ref={input} type="file" hidden accept={ACCEPT[uploadKind]} multiple={maxFiles > 1} onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
              {files.length > 0 && (
                <div className={clsx("grid gap-2", uploadKind === "image" ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-1")}>
                  {files.map((f, i) => (
                    <div key={f.preview} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      {f.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.preview} alt="" className="aspect-square w-full object-cover" />
                      ) : f.kind === "video" ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video src={f.preview} className={clsx("w-full bg-black", kind === "clip" ? "mx-auto aspect-[9/16] max-h-80 object-cover" : "max-h-72")} controls playsInline />
                      ) : (
                        <div className="flex items-center gap-3 p-3 text-sm text-white/80">
                          {f.kind === "audio" ? <Music2 className="h-5 w-5 text-orbit-cyan" /> : <FileText className="h-5 w-5 text-orbit-cyan" />}
                          <span className="min-w-0 flex-1 truncate">{f.file.name}</span>
                          <span className="text-xs text-white/40">{(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setFiles((l) => l.filter((_, k) => k !== i))}
                        aria-label="Remover"
                        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {files.length < maxFiles && (kind !== "post" || files.length > 0 || true) && (
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm font-medium text-white/75 transition hover:border-orbit-purple/50 hover:bg-orbit-purple/[0.05]"
                >
                  {uploadKind === "image" ? <ImageIcon className="h-5 w-5" /> : uploadKind === "video" ? <Film className="h-5 w-5" /> : uploadKind === "audio" ? <Music2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  {uploadKind === "image"
                    ? kind === "discussion"
                      ? "Adicionar imagem (opcional)"
                      : files.length
                        ? "Adicionar mais fotos"
                        : kind === "post"
                          ? "Adicionar fotos ou GIF (opcional)"
                          : "Escolher fotos"
                    : uploadKind === "video"
                      ? kind === "clip"
                        ? "Escolher vídeo vertical"
                        : "Escolher vídeo"
                      : uploadKind === "audio"
                        ? "Escolher áudio"
                        : "Escolher arquivo"}
                </button>
              )}
            </>
          )}

          {(kind === "post" || kind === "discussion") && canLink && kind === "post" && (
            showLink ? (
              <div className="flex items-center gap-2">
                <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={2000} placeholder="https://" inputMode="url" className={field} />
                <button type="button" onClick={() => (setShowLink(false), setLink(""))} aria-label="Remover link" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowLink(true)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-orbit-cyan hover:bg-orbit-cyan/10">
                <Link2 className="h-4 w-4" /> Adicionar link
              </button>
            )
          )}

          {kind === "photo" && albums.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Álbum</span>
              <select value={album} onChange={(e) => setAlbum(e.target.value)} className={field}>
                <option value="">Sem álbum</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {kind !== "discussion" && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {admin &&
                (Object.keys(TAG_LABEL) as PostTag[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(tag === t ? "" : t)}
                    aria-pressed={tag === t}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                      tag === t ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/60 hover:text-white"
                    )}
                  >
                    {TAG_LABEL[t].emoji} {TAG_LABEL[t].label}
                  </button>
                ))}
              <label className="ml-auto flex items-center gap-2 text-xs text-white/60">
                <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--app-accent,139_92_246))]" />
                Permitir comentários
              </label>
            </div>
          )}
          {admin && kind !== "discussion" && <p className="text-[11px] text-white/40">As etiquetas (Anúncio, Evento…) notificam todos os membros com notificações ativas.</p>}
          {community.moderation.approvePosts && rank(role) < 2 && <p className="text-[11px] text-amber-400/90">Esta comunidade revisa as publicações antes de aparecerem.</p>}
        </div>
      </div>
    </Sheet>
  );
}
