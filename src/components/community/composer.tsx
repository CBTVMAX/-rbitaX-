"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, ChevronDown, FileText, Film, Image as ImageIcon, Link2, Loader2, Music2, Pin, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { videoPoster } from "@/lib/media-thumb";
import {
  ACCEPT,
  can,
  checkFile,
  communityError,
  DISCUSSION_CATEGORIES,
  fileSize,
  isEditorOrAdmin,
  rank,
  subjectHashtag,
  TAG_LABEL,
  uploadCommunityFile,
  type Album,
  type CommunitySubject,
  type DiscussionCategory,
  type PostTag,
  type UploadKind,
} from "@/lib/communities";
import { useCommunity } from "./context";
import { Sheet } from "./ui";

export type CreateKind =
  | "post"
  | "story"
  | "discussion"
  | "event"
  | "photo"
  | "video"
  | "clip"
  | "gif"
  | "music"
  | "file"
  | "poll"
  | "album"
  | "announcement"
  | "article";

type Option = { kind: CreateKind; label: string; hint: string; emoji: string; main?: boolean };
const OPTIONS: Option[] = [
  { kind: "post", label: "Publicação", hint: "Texto, fotos, link", emoji: "📝", main: true },
  { kind: "story", label: "História", hint: "Some em 24 h", emoji: "⭕", main: true },
  { kind: "discussion", label: "Discussão", hint: "Tópico com respostas", emoji: "💬", main: true },
  { kind: "event", label: "Evento", hint: "Data, local e presença", emoji: "📅", main: true },
  { kind: "photo", label: "Fotos", hint: "Uma ou várias", emoji: "📷" },
  { kind: "video", label: "Vídeo", hint: "Com título e capa", emoji: "🎥" },
  { kind: "clip", label: "Clipe", hint: "Vertical 9:16", emoji: "🎬" },
  { kind: "gif", label: "GIF", hint: "Animação", emoji: "🌀" },
  { kind: "music", label: "Música", hint: "MP3, M4A, OGG", emoji: "🎵" },
  { kind: "file", label: "Documento", hint: "PDF, TXT ou ZIP", emoji: "📎" },
  { kind: "poll", label: "Enquete", hint: "2 a 10 opções", emoji: "📊" },
  { kind: "article", label: "Artigo", hint: "Conteúdo longo", emoji: "📰" },
  { kind: "album", label: "Álbum", hint: "Organize fotos", emoji: "🗂️" },
  { kind: "announcement", label: "Aviso", hint: "Fixado e notificado", emoji: "📣" },
];

/** Which create options this person has (mirrors the server rules; the server checks again). */
export function useCreateOptions() {
  const { community, role, viewer, membership } = useCommunity();
  return useMemo(() => {
    if (!viewer || membership?.muted) return [];
    const post = can(community, role, "post");
    const editor = isEditorOrAdmin(role);
    return OPTIONS.filter((o) => {
      switch (o.kind) {
        case "post":
        case "music":
        case "file":
        case "article":
          return post;
        case "photo":
        case "gif":
          return post && can(community, role, "photo");
        case "video":
        case "clip":
          return post && can(community, role, "video");
        case "poll":
          return post && can(community, role, "poll");
        case "discussion":
          return can(community, role, "discussion");
        case "story":
          return can(community, role, "story");
        case "event":
          return can(community, role, "event");
        case "album":
        case "announcement":
          return editor;
      }
    });
  }, [community, role, viewer, membership?.muted]);
}

export function CreateMenu({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (k: CreateKind) => void }) {
  const options = useCreateOptions();
  const { membership } = useCommunity();
  const main = options.filter((o) => o.main);
  const more = options.filter((o) => !o.main);
  const tile = (o: Option, big = false) => (
    <button
      key={o.kind}
      type="button"
      onClick={() => onPick(o.kind)}
      className={clsx(
        "group flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-1 text-center transition hover:border-orbit-purple/40 hover:bg-orbit-purple/[0.06] active:scale-95",
        big ? "py-3.5" : "py-3"
      )}
    >
      <span
        className={clsx(
          "flex items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgb(var(--app-accent,139_92_246)/0.35),rgb(var(--app-accent,139_92_246)/0.08))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition group-hover:scale-105",
          big ? "h-12 w-12 text-2xl" : "h-11 w-11 text-xl"
        )}
      >
        {o.emoji}
      </span>
      <span className="text-[12px] font-semibold leading-tight text-white">{o.label}</span>
      <span className="hidden text-[10px] leading-tight text-white/40 min-[380px]:block">{o.hint}</span>
    </button>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Criar na comunidade" wide>
      {options.length === 0 ? (
        <p className="py-4 text-sm text-white/55">
          {membership?.muted ? "Você está silenciado nesta comunidade e não pode publicar no momento." : "Você ainda não tem permissão para publicar aqui."}
        </p>
      ) : (
        <div className="space-y-4 pt-1">
          {main.length > 0 && <div className="grid grid-cols-4 gap-2">{main.map((o) => tile(o, true))}</div>}
          {more.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Mídia e mais</p>
              <div className="grid grid-cols-4 gap-2 md:grid-cols-5">{more.map((o) => tile(o))}</div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

type Picked = { file: File; preview: string; kind: UploadKind };
export type ComposerKind = Exclude<CreateKind, "story" | "event" | "album">;

const TITLES: Record<ComposerKind, string> = {
  post: "Nova publicação",
  discussion: "Nova discussão",
  photo: "Novas fotos",
  video: "Novo vídeo",
  clip: "Novo clipe",
  gif: "Novo GIF",
  music: "Nova música",
  file: "Novo documento",
  poll: "Nova enquete",
  article: "Novo artigo",
  announcement: "Novo aviso",
};

export function Composer({
  kind,
  onClose,
  onCreated,
  albums = [],
  defaultAlbum = null,
  defaultTag = null,
  suggest = false,
}: {
  kind: ComposerKind | null;
  /** "Sugerir post" (VK): quem não pode publicar envia para a administração aprovar. */
  suggest?: boolean;
  onClose: () => void;
  onCreated: (result: { id: string; status: string; kind: CreateKind }) => void;
  albums?: Album[];
  defaultAlbum?: string | null;
  /** Pre-selects a tag (e.g. the announcement tool in Gerenciar). */
  defaultTag?: PostTag | null;
}) {
  const { supabase, community, viewer, role, toast, canAsCommunity } = useCommunity();
  // Identidade da publicação: perfil pessoal x comunidade (§7). Lembra a última escolha (§42).
  const [asCommunity, setAsCommunity] = useState(false);
  const [idOpen, setIdOpen] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [files, setFiles] = useState<Picked[]>([]);
  const [thumb, setThumb] = useState<{ file: File; preview: string } | null>(null);
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [musicTitle, setMusicTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tag, setTag] = useState<PostTag | "">("");
  const [pin, setPin] = useState(false);
  const [category, setCategory] = useState<DiscussionCategory>("geral");
  const [album, setAlbum] = useState<string>(defaultAlbum ?? "");
  const [comments, setComments] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText("");
    setTitle("");
    setLink("");
    setShowLink(false);
    setFiles((f) => (f.forEach((x) => URL.revokeObjectURL(x.preview)), []));
    setThumb(null);
    setOptions(["", ""]);
    setMultiple(false);
    setMusicTitle("");
    setArtist("");
    setTag(kind === "announcement" ? defaultTag ?? "anuncio" : defaultTag ?? "");
    setPin(kind === "announcement");
    setCategory("geral");
    setAlbum(defaultAlbum ?? "");
    setComments(true);
    setError(null);
    setProgress("");
    setIdOpen(false);
  }, [kind, defaultAlbum, defaultTag]);

  // Assuntos (ator/personagem) cadastrados: viram chips que inserem a hashtag no texto.
  const [subjects, setSubjects] = useState<CommunitySubject[]>([]);
  useEffect(() => {
    if (!kind) return;
    let alive = true;
    supabase.rpc("community_hashtags", { p_community: community.id }).then(({ data }) => {
      if (alive) setSubjects((data ?? []) as CommunitySubject[]);
    });
    return () => {
      alive = false;
    };
  }, [kind, supabase, community.id]);

  function addSubject(label: string) {
    const h = subjectHashtag(label, community.hashtagSuffix);
    setText((t) => {
      if (t.split(/\s+/).includes(h)) return t; // já está no texto
      return t && !/\s$/.test(t) ? `${t} ${h} ` : `${t}${h} `;
    });
  }

  // Restaura a última identidade escolhida nesta comunidade (só se a pessoa puder publicar como comunidade).
  useEffect(() => {
    if (!kind) return;
    if (!canAsCommunity) return setAsCommunity(false);
    try {
      setAsCommunity(localStorage.getItem(`orbitax:comm-as:${community.id}`) === "1");
    } catch {
      /* localStorage indisponível: mantém perfil pessoal */
    }
  }, [kind, canAsCommunity, community.id]);

  function chooseIdentity(next: boolean) {
    setAsCommunity(next);
    setIdOpen(false);
    try {
      localStorage.setItem(`orbitax:comm-as:${community.id}`, next ? "1" : "0");
    } catch {
      /* ok */
    }
  }

  if (!kind || !viewer) return null;
  const editor = isEditorOrAdmin(role);
  const identityName = asCommunity ? community.name : viewer.name;
  const identityAvatar = asCommunity ? community.avatarUrl : viewer.avatarUrl;
  const identities = [
    { as: false, name: viewer.name, url: viewer.avatarUrl, sub: "Seu perfil pessoal" },
    { as: true, name: community.name, url: community.avatarUrl, sub: "Perfil da comunidade" },
  ];
  const uploadKind: UploadKind | null =
    kind === "photo" || kind === "post" || kind === "discussion" || kind === "gif" || kind === "article" || kind === "announcement"
      ? "image"
      : kind === "video" || kind === "clip"
        ? "video"
        : kind === "music"
          ? "audio"
          : kind === "file"
            ? "file"
            : null;
  const maxFiles = kind === "photo" || kind === "post" || kind === "gif" || kind === "announcement" ? 10 : 1;
  const canLink = can(community, role, "link") && !(community.moderation.blockLinks && rank(role) < 2);
  const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";

  function pick(list: FileList | null) {
    if (!list || !uploadKind) return;
    const next: Picked[] = [];
    for (const f of Array.from(list)) {
      if (kind === "gif" && f.type !== "image/gif") {
        setError("Escolha arquivos .gif animados.");
        continue;
      }
      const problem = checkFile(f, uploadKind);
      if (problem) {
        setError(problem);
        continue;
      }
      next.push({ file: f, preview: URL.createObjectURL(f), kind: uploadKind });
    }
    setFiles((cur) => [...cur, ...next].slice(0, maxFiles));
    if (next.length) setError(null);
    if (kind === "music" && next[0] && !musicTitle) setMusicTitle(next[0].file.name.replace(/\.[^.]+$/, "").slice(0, 120));
    // Videos get a real frame as their cover right away (can be replaced).
    if ((kind === "video" || kind === "clip") && next[0])
      videoPoster(next[0].file).then((p) => p && setThumb((t) => t ?? { file: p, preview: URL.createObjectURL(p) }));
  }

  function pickThumb(f: File | undefined) {
    if (!f) return;
    const problem = checkFile(f, "image");
    if (problem) return setError(problem);
    setThumb({ file: f, preview: URL.createObjectURL(f) });
  }

  async function submit() {
    if (!viewer || !kind) return;
    setError(null);
    if (kind === "discussion" && title.trim().length < 3) return setError("Dê um título com pelo menos 3 caracteres.");
    if (kind === "article" && title.trim().length < 3) return setError("Dê um título ao artigo.");
    if (kind === "article" && text.trim().length < 20) return setError("Escreva pelo menos 20 caracteres no artigo.");
    if (kind === "poll" && (text.trim().length < 1 || options.filter((o) => o.trim()).length < 2)) return setError("A enquete precisa de uma pergunta e pelo menos 2 opções.");
    if (["photo", "video", "clip", "music", "file", "gif"].includes(kind) && files.length === 0) return setError("Escolha o arquivo antes de publicar.");
    if ((kind === "post" || kind === "announcement") && !text.trim() && files.length === 0 && !link.trim()) return setError("Escreva algo ou adicione uma mídia.");
    setBusy(true);
    try {
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(files.length > 1 ? `Enviando ${i + 1} de ${files.length}…` : "Enviando arquivo…");
        uploaded.push(await uploadCommunityFile(supabase, viewer.id, community.id, files[i].file, files[i].kind));
      }
      let thumbnailUrl: string | null = null;
      if (thumb && (kind === "video" || kind === "clip")) {
        setProgress("Enviando capa…");
        thumbnailUrl = (await uploadCommunityFile(supabase, viewer.id, community.id, thumb.file, "image")).url;
      }
      setProgress(suggest ? "Enviando sugestão…" : "Publicando…");
      if (suggest) {
        const hasImages = uploaded.some((u) => u.type === "image");
        const payload: Record<string, unknown> = {
          kind: hasImages ? "image" : link.trim() ? "link" : "text",
          content: text,
          media: uploaded.map((u) => ({ type: u.type, url: u.url, width: u.width, height: u.height, sizeBytes: u.sizeBytes, mimeType: u.mimeType, name: u.name })),
        };
        if (link.trim()) payload.linkUrl = /^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`;
        const { data, error: e } = await supabase.rpc("community_suggest_post" as never, { p_community: community.id, p: payload } as never);
        if (e) throw new Error(communityError((e as { message: string }).message));
        // "suggested" (não "pending"): quem chama não repete o aviso de moderação.
        onCreated({ id: (data as unknown as { id: string }).id, status: "suggested", kind: "post" });
        toast("Sugestão enviada! A administração vai analisar antes de publicar.");
        onClose();
        return;
      }
      if (kind === "discussion") {
        const { data, error: e } = await supabase.rpc("community_create_discussion", {
          p_community: community.id,
          p_title: title.trim(),
          p_body: text.trim(),
          p_image: uploaded[0]?.url ?? null,
          p_category: category,
          p_as_community: asCommunity,
        });
        if (e) throw new Error(communityError(e.message));
        onCreated({ ...(data as { id: string; status: string }), kind });
      } else {
        const hasImages = uploaded.some((u) => u.type === "image");
        const postKind =
          kind === "post" || kind === "announcement"
            ? hasImages
              ? "image"
              : link.trim()
                ? "link"
                : "text"
            : kind === "photo"
              ? "image"
              : kind;
        const payload: Record<string, unknown> = {
          kind: postKind,
          content: kind === "poll" ? "" : text,
          commentsEnabled: comments,
          media: uploaded.map((u, i) => ({
            type: u.type,
            url: u.url,
            width: u.width,
            height: u.height,
            sizeBytes: u.sizeBytes,
            mimeType: u.mimeType,
            name: u.name,
            ...(i === 0 && thumbnailUrl ? { thumbnailUrl } : {}),
          })),
        };
        if (link.trim()) payload.linkUrl = /^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`;
        if (kind === "poll") payload.poll = { question: text.trim(), options: options.map((o) => o.trim()).filter(Boolean), multiple };
        if (kind === "music") payload.music = { title: musicTitle.trim() || files[0]?.file.name.replace(/\.[^.]+$/, "") || "Áudio", artist: artist.trim() };
        if (kind === "article") payload.article = { title: title.trim() };
        if ((kind === "video" || kind === "clip") && title.trim()) payload.video = { title: title.trim() };
        if (asCommunity) payload.asCommunity = true;
        if (tag && editor) payload.tag = tag;
        if (pin && editor) payload.pin = true;
        if (album && postKind === "image") payload.albumId = album;
        const { data, error: e } = await supabase.rpc("community_create_post", { p_community: community.id, p: payload as never });
        if (e) throw new Error(communityError(e.message));
        const r = data as { id: string; status: string; pinned?: boolean };
        if (pin && r.status === "visible" && r.pinned === false) toast("Já existem 3 publicações fixadas: este aviso foi publicado sem fixar.", true);
        onCreated({ ...r, kind });
      }
      toast(kind === "announcement" ? "Aviso publicado e enviado aos membros." : "Publicado!");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar agora.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const placeholder: Partial<Record<ComposerKind, string>> = {
    poll: "Pergunta da enquete",
    discussion: "Descreva o tópico (opcional)",
    clip: "Legenda do clipe",
    video: "Descrição do vídeo (opcional)",
    article: "Escreva o artigo… (use linhas em branco para separar parágrafos)",
    announcement: "Escreva o aviso para todos os membros",
    gif: "Legenda (opcional)",
    music: "Conte algo sobre a música (opcional)",
    file: "Descreva o documento (opcional)",
  };

  return (
    <Sheet
      open={!!kind}
      onClose={() => !busy && onClose()}
      wide
      title={suggest ? "Sugerir post" : TITLES[kind]}
      footer={
        <div className="flex items-center gap-2">
          {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <p className="min-w-0 flex-1 truncate text-xs text-white/45">{progress || `em ${community.name}`}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {suggest ? "Enviar sugestão" : "Publicar"}
          </button>
        </div>
      }
    >
      <div className="flex gap-3 pt-1">
        <Avatar name={identityName} url={identityAvatar} size={40} />
        <div className="min-w-0 flex-1 space-y-3">
          {canAsCommunity && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIdOpen((o) => !o)}
                aria-expanded={idOpen}
                className="flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs transition hover:border-orbit-purple/40 hover:bg-white/[0.06]"
              >
                <span className="shrink-0 text-white/45">Publicar como</span>
                <span className="truncate font-semibold text-white">{identityName}</span>
                <ChevronDown className={clsx("h-3.5 w-3.5 shrink-0 text-white/45 transition", idOpen && "rotate-180")} />
              </button>
              {idOpen && (
                <>
                  <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setIdOpen(false)} />
                  <div className="absolute left-0 top-full z-20 mt-1.5 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-white/10 bg-space-surface p-1 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]">
                    {identities.map((o) => (
                      <button
                        key={String(o.as)}
                        type="button"
                        onClick={() => chooseIdentity(o.as)}
                        className={clsx("flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/5", asCommunity === o.as && "bg-white/[0.04]")}
                      >
                        <Avatar name={o.name} url={o.url} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{o.name}</span>
                          <span className="block truncate text-[11px] text-white/45">{o.sub}</span>
                        </span>
                        {asCommunity === o.as && <Check className="h-4 w-4 shrink-0 text-orbit-cyan" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {(kind === "discussion" || kind === "article" || kind === "video" || kind === "clip") && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder={kind === "discussion" ? "Título da discussão" : kind === "article" ? "Título do artigo" : "Título (opcional)"}
              className={clsx(field, "font-semibold")}
              autoFocus
            />
          )}
          {kind === "discussion" && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
              {DISCUSSION_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  aria-pressed={category === c.id}
                  className={clsx("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition", category === c.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65 hover:text-white")}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={kind === "poll" ? 200 : kind === "article" ? 20000 : 5000}
            rows={kind === "poll" ? 2 : kind === "article" ? 12 : 4}
            autoFocus={!["discussion", "article", "video", "clip"].includes(kind)}
            placeholder={placeholder[kind] ?? `Compartilhe com ${community.name}…`}
            className={clsx(field, "resize-none leading-relaxed", kind === "article" && "resize-y")}
          />
          {kind === "article" && <p className="-mt-2 text-right text-[11px] text-white/35">{text.length.toLocaleString("pt-BR")}/20.000</p>}

          {subjects.length > 0 && ["post", "announcement", "article", "discussion", "photo", "video", "clip", "gif"].includes(kind) && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Marcar assunto</p>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                {subjects.map((s) => {
                  const h = subjectHashtag(s.label, community.hashtagSuffix);
                  const active = text.split(/\s+/).includes(h);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addSubject(s.label)}
                      aria-pressed={active}
                      className={clsx(
                        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        active ? "bg-orbit-gradient text-snow" : "border border-white/10 text-orbit-cyan hover:bg-orbit-purple/10"
                      )}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {kind === "poll" && (
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={o} onChange={(e) => setOptions((l) => l.map((x, k) => (k === i ? e.target.value : x)))} maxLength={100} placeholder={`Opção ${i + 1}`} className={field} />
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
              <input
                ref={input}
                type="file"
                hidden
                accept={kind === "gif" ? "image/gif" : ACCEPT[uploadKind]}
                multiple={maxFiles > 1}
                onChange={(e) => (pick(e.target.files), (e.target.value = ""))}
              />
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
                          <span className="text-xs text-white/40">{fileSize(f.file.size)}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => (setFiles((l) => l.filter((_, k) => k !== i)), (kind === "video" || kind === "clip") && setThumb(null))}
                        aria-label="Remover"
                        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {files.length < maxFiles && (
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm font-medium text-white/75 transition hover:border-orbit-purple/50 hover:bg-orbit-purple/[0.05]"
                >
                  {uploadKind === "image" ? <ImageIcon className="h-5 w-5" /> : uploadKind === "video" ? <Film className="h-5 w-5" /> : uploadKind === "audio" ? <Music2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  {kind === "gif"
                    ? files.length
                      ? "Adicionar mais GIFs"
                      : "Escolher GIF"
                    : kind === "discussion"
                      ? "Adicionar imagem (opcional)"
                      : kind === "article"
                        ? "Adicionar imagem de capa (opcional)"
                        : uploadKind === "image"
                          ? files.length
                            ? "Adicionar mais fotos"
                            : kind === "post" || kind === "announcement"
                              ? "Adicionar fotos ou GIF (opcional)"
                              : "Escolher fotos"
                          : uploadKind === "video"
                            ? kind === "clip"
                              ? "Escolher vídeo vertical"
                              : "Escolher vídeo"
                            : uploadKind === "audio"
                              ? "Escolher áudio"
                              : "Escolher documento"}
                </button>
              )}
            </>
          )}

          {(kind === "video" || kind === "clip") && files.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-2.5">
              <span className={clsx("overflow-hidden rounded-xl bg-black", kind === "clip" ? "h-20 w-12" : "h-14 w-24")}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb.preview} alt="Capa do vídeo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 text-xs text-white/60">
                <span className="block font-semibold text-white">Miniatura</span>
                Gerada a partir do vídeo. Você pode escolher outra imagem.
              </span>
              <input ref={thumbInput} type="file" hidden accept={ACCEPT.image} onChange={(e) => (pickThumb(e.target.files?.[0]), (e.target.value = ""))} />
              <button type="button" onClick={() => thumbInput.current?.click()} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-semibold text-white/80 hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" /> Trocar
              </button>
            </div>
          )}

          {(kind === "post" || kind === "announcement") && canLink &&
            (showLink ? (
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
            ))}

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
              {editor &&
                (kind === "announcement" || kind === "post" || kind === "article" || kind === "photo" || kind === "video") &&
                (Object.keys(TAG_LABEL) as PostTag[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(tag === t && kind !== "announcement" ? "" : t)}
                    aria-pressed={tag === t}
                    className={clsx("rounded-full px-3 py-1.5 text-[11px] font-semibold transition", tag === t ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/60 hover:text-white")}
                  >
                    {TAG_LABEL[t].emoji} {TAG_LABEL[t].label}
                  </button>
                ))}
              {!suggest && (
              <label className="ml-auto flex items-center gap-2 text-xs text-white/60">
                <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--app-accent,139_92_246))]" />
                Permitir comentários
              </label>
              )}
            </div>
          )}
          {editor && kind !== "discussion" && (
            <button type="button" onClick={() => setPin((v) => !v)} aria-pressed={pin} className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-white/10 px-3 text-left">
              <Pin className={clsx("h-4 w-4", pin ? "text-orbit-cyan" : "text-white/45")} />
              <span className="min-w-0 flex-1 text-xs text-white/80">Fixar no topo da comunidade (até 3 fixadas)</span>
              <span className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", pin ? "bg-orbit-gradient" : "bg-white/15")}>
                <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", pin ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
          )}
          {editor && tag && <p className="text-[11px] text-white/40">Publicações com etiqueta (Aviso, Evento…) notificam todos os membros com notificações ativas e aparecem em Avisos.</p>}
          {suggest && (
            <p className="rounded-2xl border border-orbit-cyan/25 bg-orbit-cyan/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-white/75">
              Sua sugestão vai para a administração de {community.name}. Se for aprovada, aparece no mural com o seu nome e você recebe um aviso.
            </p>
          )}
          {!suggest && community.moderation.approvePosts && rank(role) < 2 && !editor && <p className="text-[11px] text-amber-400/90">Esta comunidade revisa as publicações antes de aparecerem.</p>}
        </div>
      </div>
    </Sheet>
  );
}
