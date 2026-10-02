"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Camera,
  Clapperboard,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Film,
  FolderPlus,
  Heart,
  Images,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Music2,
  Pause,
  Pencil,
  Play,
  Plus,
  ScrollText,
  Share2,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { ago, communityError, compactNumber, fileSize, isEditorOrAdmin, type Album, type CommunityPost, type ContentTabId } from "@/lib/communities";
import { loadCommunityPosts, type PostFilter } from "@/lib/community-data";
import { useCommunity } from "./context";
import type { CreateKind } from "./composer";
import { CommunityPostCard } from "./post-card";
import { Confirm, EmptyState, Sheet } from "./ui";
import { Lightbox } from "./lightbox";

export type ContentTab = ContentTabId;
export const CONTENT_TABS: { id: ContentTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "tudo", label: "Tudo", icon: LayoutGrid },
  { id: "posts", label: "Posts", icon: ScrollText },
  { id: "fotos", label: "Fotos", icon: Camera },
  { id: "videos", label: "Vídeos", icon: Film },
  { id: "clipes", label: "Clipes", icon: Clapperboard },
  { id: "musica", label: "Música", icon: Music2 },
  { id: "gifs", label: "GIFs", icon: Sparkles },
  { id: "arquivos", label: "Arquivos", icon: FileText },
];
export type ContentCounts = Partial<Record<ContentTab, number>>;

const FILTERS: Record<ContentTab, PostFilter> = {
  tudo: { pinned: false, excludeKinds: ["clip"] },
  posts: { kinds: ["text", "link", "poll", "article"] },
  fotos: { kinds: ["image"] },
  videos: { kinds: ["video"] },
  clipes: { kinds: ["clip"] },
  musica: { kinds: ["music"] },
  gifs: { kinds: ["gif"] },
  arquivos: { kinds: ["file"] },
};

export function usePaged(load: (before?: string) => Promise<CommunityPost[]>, initial: CommunityPost[] | null, deps: unknown[], size = 15) {
  const [items, setItems] = useState<CommunityPost[] | null>(initial);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (initial) {
      setItems(initial);
      setDone(initial.length < size);
      return;
    }
    let alive = true;
    setItems(null);
    load().then((r) => {
      if (!alive) return;
      setItems(r);
      setDone(r.length < size);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const more = async () => {
    if (!items?.length || loading) return;
    setLoading(true);
    const r = await load(items[items.length - 1].createdAt);
    setLoading(false);
    setItems([...items, ...r]);
    if (r.length < size) setDone(true);
  };
  return { items, setItems, done, loading, more };
}

export function MoreButton({ done, loading, more }: { done: boolean; loading: boolean; more: () => void }) {
  if (done) return null;
  return (
    <button type="button" onClick={more} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />} Carregar mais
    </button>
  );
}

export function Feed({ items, loading, done, more, setItems, empty, focusId }: {
  items: CommunityPost[] | null;
  loading: boolean;
  done: boolean;
  more: () => void;
  setItems: (f: CommunityPost[]) => void;
  empty: React.ReactNode;
  focusId?: string;
}) {
  if (items === null)
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-white/[0.04]" />
        ))}
      </div>
    );
  if (!items.length) return <>{empty}</>;
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <CommunityPostCard
          key={p.id}
          post={p}
          highlight={p.id === focusId}
          onChanged={(n) => setItems(items.map((x) => (x.id === n.id ? n : x)))}
          onDeleted={(id) => setItems(items.filter((x) => x.id !== id))}
        />
      ))}
      <MoreButton done={done} loading={loading} more={more} />
    </div>
  );
}

/** Vertical, full-screen clips: scroll snaps one clip at a time and plays only the one on screen. */
function ClipViewer({ clips, start, onClose, onOpenPost }: { clips: CommunityPost[]; start: number; onClose: () => void; onOpenPost: (p: CommunityPost) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.scrollTo({ top: start * el.clientHeight });
    const videos = Array.from(el.querySelectorAll("video"));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? (e.target as HTMLVideoElement).play().catch(() => {}) : (e.target as HTMLVideoElement).pause())), { root: el, threshold: 0.7 });
    videos.forEach((v) => io.observe(v));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      io.disconnect();
      document.body.style.overflow = prev;
    };
  }, [start]);
  return (
    <div className="fixed inset-0 z-[85] bg-black" role="dialog" aria-label="Clipes">
      <button type="button" onClick={onClose} aria-label="Fechar" className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
        <X className="h-5 w-5" />
      </button>
      <div ref={box} className="h-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none]">
        {clips.map((c) => {
          const v = c.media.find((m) => m.type === "video");
          return (
            <section key={c.id} className="relative flex h-full snap-start items-center justify-center">
              {v && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={v.url} poster={v.thumbnailUrl ?? undefined} loop playsInline preload="metadata" className="h-full max-h-full w-full max-w-[min(100vw,56.25vh)] object-cover" onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())} />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
                <div className="mx-auto flex max-w-[min(100vw,56.25vh)] items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold text-white">
                      {c.author.name} {c.author.isVerified && <VerifiedBadge />}
                    </p>
                    {c.meta.video?.title && <p className="mt-0.5 text-sm font-semibold text-white">{c.meta.video.title}</p>}
                    {c.content && <p className="mt-1 line-clamp-3 text-sm text-white/85">{c.content}</p>}
                  </div>
                  <div className="pointer-events-auto flex flex-col items-center gap-3 text-white">
                    {[
                      { icon: <Heart className={clsx("h-5 w-5", c.likedByMe && "fill-orbit-pink text-orbit-pink")} />, label: compactNumber(c.likeCount) },
                      { icon: <MessageCircle className="h-5 w-5" />, label: compactNumber(c.commentCount) },
                      { icon: <Share2 className="h-5 w-5" />, label: "Mais" },
                    ].map((b, i) => (
                      <button key={i} type="button" onClick={() => onOpenPost(c)} className="flex flex-col items-center text-[11px]">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">{b.icon}</span>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Community soundtrack: a queue of the music posts with a mini player that keeps playing while you scroll. */
function MusicTab({ items, done, loading, more, onOpen }: { items: CommunityPost[]; done: boolean; loading: boolean; more: () => void; onOpen: (p: CommunityPost) => void }) {
  const tracks = items.map((p) => ({ post: p, audio: p.media.find((m) => m.type === "audio") })).filter((t) => t.audio);
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const audio = useRef<HTMLAudioElement>(null);
  const current = index !== null ? tracks[index] : null;

  useEffect(() => {
    const a = audio.current;
    if (!a || !current) return;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [current]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const toggle = (i: number) => {
    if (i === index) {
      const a = audio.current;
      if (!a) return;
      if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
      else (a.pause(), setPlaying(false));
    } else setIndex(i);
  };

  if (!tracks.length) return <EmptyState icon={<Music2 className="h-6 w-6" />} title="Nenhuma música ainda" text="Músicas e áudios publicados na comunidade aparecem aqui como uma playlist." />;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/80">
        {tracks.map((t, i) => (
          <div key={t.post.id} className={clsx("flex min-h-[56px] items-center gap-3 border-b border-white/[0.05] px-3 py-2 last:border-0", index === i && "bg-orbit-purple/[0.08]")}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-label={index === i && playing ? "Pausar" : "Tocar"}
              className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-snow transition", index === i ? "bg-orbit-gradient shadow-glow" : "bg-white/[0.07] hover:bg-white/[0.12]")}
            >
              {index === i && playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={clsx("truncate text-sm font-semibold", index === i ? "text-orbit-cyan" : "text-white")}>{t.post.meta.music?.title ?? "Áudio"}</p>
              <p className="truncate text-xs text-white/45">
                {t.post.meta.music?.artist || t.post.author.name} · {ago(t.post.createdAt)}
              </p>
            </div>
            <button type="button" onClick={() => onOpen(t.post)} className="flex h-10 w-10 items-center justify-center rounded-full text-white/45 hover:bg-white/5 hover:text-white" aria-label="Ver publicação e comentários">
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <MoreButton done={done} loading={loading} more={more} />
      {current && (
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-3xl border border-white/10 bg-space-surface/95 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl md:bottom-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orbit-gradient text-snow">
            <Music2 className={clsx("h-5 w-5", playing && "animate-pulse")} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{current.post.meta.music?.title ?? "Áudio"}</p>
            <input
              type="range"
              min={0}
              max={time.dur || 0}
              step={0.5}
              value={time.cur}
              onChange={(e) => audio.current && (audio.current.currentTime = Number(e.target.value))}
              aria-label="Posição da música"
              className="h-1.5 w-full accent-[rgb(var(--app-accent,139_92_246))]"
            />
            <p className="flex justify-between text-[10px] tabular-nums text-white/40">
              <span>{fmt(time.cur)}</span>
              <span>{time.dur ? fmt(time.dur) : "--:--"}</span>
            </p>
          </div>
          <button type="button" onClick={() => setIndex((i) => (i !== null && i > 0 ? i - 1 : i))} aria-label="Anterior" className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/5">
            <SkipBack className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => index !== null && toggle(index)} aria-label={playing ? "Pausar" : "Tocar"} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-space-bg">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button type="button" onClick={() => setIndex((i) => (i !== null && i < tracks.length - 1 ? i + 1 : i))} aria-label="Próxima" className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/5">
            <SkipForward className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={audio}
            src={current.audio!.url}
            preload="auto"
            onTimeUpdate={(e) => setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration || 0 })}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onEnded={() => (index !== null && index < tracks.length - 1 ? setIndex(index + 1) : setPlaying(false))}
          />
        </div>
      )}
    </div>
  );
}

function fileKind(mime: string | null | undefined, name: string) {
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return { label: "PDF", icon: FileText, viewable: true };
  if (mime === "application/zip" || /\.zip$/i.test(name)) return { label: "ZIP", icon: FileArchive, viewable: false };
  if (mime === "text/plain" || /\.txt$/i.test(name)) return { label: "Texto", icon: FileText, viewable: true };
  return { label: "Arquivo", icon: FileText, viewable: false };
}

function FilesTab({ items, done, loading, more }: { items: CommunityPost[]; done: boolean; loading: boolean; more: () => void }) {
  const files = items.flatMap((p) => p.media.filter((m) => m.type === "file").map((m) => ({ m, p })));
  if (!files.length) return <EmptyState icon={<FileText className="h-6 w-6" />} title="Nenhum arquivo ainda" text="Documentos (PDF, TXT, ZIP) compartilhados na comunidade ficam organizados aqui." />;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/80">
        {files.map(({ m, p }) => {
          const name = m.name || decodeURIComponent(m.url.split("/").pop() ?? "Arquivo");
          const k = fileKind(m.mimeType, name);
          const Icon = k.icon;
          return (
            <div key={m.id} className="flex min-h-[58px] items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 last:border-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-orbit-cyan">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{name}</p>
                <p className="truncate text-xs text-white/45">
                  {k.label}
                  {m.sizeBytes ? ` · ${fileSize(m.sizeBytes)}` : ""} · {p.author.name} · {ago(p.createdAt)}
                </p>
              </div>
              {k.viewable && (
                <a href={m.url} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-white/65 hover:bg-white/5 hover:text-white">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <a href={`${m.url}?download=${encodeURIComponent(name)}`} download={name} aria-label={`Baixar ${name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit-gradient text-snow">
                <Download className="h-4 w-4" />
              </a>
            </div>
          );
        })}
      </div>
      <MoreButton done={done} loading={loading} more={more} />
    </div>
  );
}

export function ContentCenter({
  initialTab = "tudo",
  initialItems = null,
  albums: initialAlbums = [],
  counts = {},
  customTabs = [],
  refreshKey = 0,
  focusId,
  syncUrl = true,
  onCompose,
  header,
}: {
  initialTab?: ContentTab;
  /** Server-rendered first page of the "Tudo" tab. */
  initialItems?: CommunityPost[] | null;
  albums?: Album[];
  counts?: ContentCounts;
  /** Abas personalizadas do mural (§2), definidas pelo proprietário. */
  customTabs?: { id: string; name: string }[];
  refreshKey?: number;
  focusId?: string;
  syncUrl?: boolean;
  onCompose?: (kind: CreateKind, opts?: { album?: string | null; editAlbum?: Album | null }) => void;
  header?: React.ReactNode;
}) {
  const { supabase, community, viewer, role, toast } = useCommunity();
  const [tab, setTab] = useState<string>(initialTab);
  const isCustom = tab.startsWith("c:");
  const [albums, setAlbums] = useState(initialAlbums);
  const [album, setAlbum] = useState<string | null>(null);
  const [photoView, setPhotoView] = useState<number | null>(null);
  const [gifView, setGifView] = useState<number | null>(null);
  const [clipIndex, setClipIndex] = useState<number | null>(null);
  const [openPost, setOpenPost] = useState<CommunityPost | null>(null);
  const [deleteAlbum, setDeleteAlbum] = useState<string | null>(null);
  const me = viewer?.id ?? null;
  const editor = isEditorOrAdmin(role);

  useEffect(() => setAlbums(initialAlbums), [initialAlbums]);
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("album");
    if (a && initialAlbums.some((x) => x.id === a)) setAlbum(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    if (tab === "tudo") url.searchParams.delete("aba");
    else url.searchParams.set("aba", tab);
    if (tab !== "fotos" || !album) url.searchParams.delete("album");
    else url.searchParams.set("album", album);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [tab, album, syncUrl]);

  const load = useCallback(
    (f: PostFilter) => (before?: string) => loadCommunityPosts(supabase, community.id, me, { ...f, before, limit: 15 }),
    [supabase, community.id, me]
  );
  const activeFilter: PostFilter = isCustom
    ? { tabId: tab.slice(2), excludeKinds: ["clip"] }
    : tab === "fotos" && album
      ? { ...FILTERS.fotos, albumId: album }
      : FILTERS[tab as ContentTab];
  const feed = usePaged(
    load(activeFilter),
    tab === "tudo" && refreshKey === 0 ? initialItems : null,
    [tab, album, refreshKey]
  );

  const items = feed.items;
  const photoItems = tab === "fotos" ? (items ?? []).flatMap((p) => p.media.filter((m) => m.type === "image").map((m) => ({ ...m, post: p }))) : [];
  const gifItems = tab === "gifs" ? (items ?? []).flatMap((p) => p.media.filter((m) => m.type === "image").map((m) => ({ ...m, post: p }))) : [];
  const videos = tab === "videos" ? (items ?? []).map((p) => ({ p, v: p.media.find((m) => m.type === "video") })).filter((x) => x.v) : [];

  async function removeAlbum(id: string) {
    const { error } = await supabase.rpc("community_delete_album", { p_album: id });
    setDeleteAlbum(null);
    if (error) return toast(communityError(error.message), true);
    setAlbums((l) => l.filter((a) => a.id !== id));
    setAlbum(null);
    toast("Álbum excluído. As fotos continuam na comunidade.");
  }

  const grid = (n: number, aspect: string) => (
    <div className="grid grid-cols-3 gap-1 md:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={clsx("animate-pulse rounded-lg bg-white/[0.04]", aspect)} />
      ))}
    </div>
  );

  let content: React.ReactNode;
  if (tab === "tudo" || tab === "posts" || isCustom)
    content = (
      <Feed
        {...feed}
        focusId={focusId}
        empty={
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title={tab === "tudo" ? "Nenhuma publicação ainda" : "Sem posts por aqui"}
            text={tab === "tudo" ? "Toque em + Criar para começar a conversa." : "Textos, artigos, enquetes e links aparecem nesta aba."}
          />
        }
      />
    );
  else if (tab === "fotos")
    content = (
      <div className="space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          <button type="button" onClick={() => setAlbum(null)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", album === null ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
            Todas as fotos
          </button>
          {albums.map((a) => (
            <button key={a.id} type="button" onClick={() => setAlbum(a.id)} className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", album === a.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
              <Images className="mr-1 inline h-3.5 w-3.5" /> {a.title}
            </button>
          ))}
          {editor && onCompose && (
            <button type="button" onClick={() => onCompose("album")} className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-white/20 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white">
              <FolderPlus className="h-3.5 w-3.5" /> Novo álbum
            </button>
          )}
        </div>
        {album &&
          (() => {
            const a = albums.find((x) => x.id === album);
            if (!a) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-space-card/60 p-3">
                {a.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  {a.description && <p className="text-xs text-white/50">{a.description}</p>}
                </div>
                {onCompose && viewer && (
                  <button type="button" onClick={() => onCompose("photo", { album })} className="flex h-10 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow">
                    <Plus className="h-4 w-4" /> Enviar fotos
                  </button>
                )}
                {editor && onCompose && (
                  <>
                    <button type="button" onClick={() => onCompose("album", { editAlbum: a })} aria-label="Editar álbum" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/80">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setDeleteAlbum(a.id)} aria-label="Excluir álbum" className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/30 text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        {items === null ? (
          grid(9, "aspect-square")
        ) : photoItems.length === 0 ? (
          <EmptyState
            icon={<Camera className="h-6 w-6" />}
            title="Nenhuma foto ainda"
            action={onCompose && viewer ? <button type="button" onClick={() => onCompose("photo", { album })} className="rounded-full bg-orbit-gradient px-5 py-2.5 text-xs font-semibold text-snow">Enviar fotos</button> : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl md:grid-cols-4">
              {photoItems.map((m, i) => (
                <button key={m.id} type="button" onClick={() => setPhotoView(i)} className="group relative aspect-square overflow-hidden bg-white/[0.04]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                </button>
              ))}
            </div>
            <MoreButton {...feed} />
          </>
        )}
      </div>
    );
  else if (tab === "gifs")
    content =
      items === null ? (
        grid(6, "aspect-square")
      ) : gifItems.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Nenhum GIF ainda" text="Publique um GIF pelo + Criar." />
      ) : (
        <div className="space-y-3">
          <div className="columns-2 gap-2 md:columns-3">
            {gifItems.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setGifView(i)} className="mb-2 block w-full overflow-hidden rounded-2xl bg-white/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.post.content || "GIF"} loading="lazy" className="w-full" />
              </button>
            ))}
          </div>
          <MoreButton {...feed} />
        </div>
      );
  else if (tab === "videos")
    content =
      items === null ? (
        grid(6, "aspect-video")
      ) : videos.length === 0 ? (
        <EmptyState icon={<Film className="h-6 w-6" />} title="Nenhum vídeo ainda" />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.map(({ p, v }) => (
              <button key={p.id} type="button" onClick={() => setOpenPost(p)} className="group overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/80 text-left transition hover:border-orbit-purple/40">
                <span className="relative block aspect-video overflow-hidden bg-black">
                  {v!.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v!.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={`${v!.url}#t=0.6`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition group-hover:scale-110">
                      <Play className="h-6 w-6 fill-white" />
                    </span>
                  </span>
                </span>
                <span className="block p-3">
                  <span className="line-clamp-2 text-sm font-semibold text-white">{p.meta.video?.title || p.content || "Vídeo"}</span>
                  <span className="mt-0.5 block truncate text-xs text-white/45">
                    {p.author.name} · {compactNumber(p.viewCount)} {p.viewCount === 1 ? "visualização" : "visualizações"} · {ago(p.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <MoreButton {...feed} />
        </div>
      );
  else if (tab === "clipes")
    content =
      items === null ? (
        grid(6, "aspect-[9/16]")
      ) : items.length === 0 ? (
        <EmptyState icon={<Clapperboard className="h-6 w-6" />} title="Nenhum clipe ainda" text="Clipes são vídeos verticais curtos, feitos para o celular." />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1 md:grid-cols-4">
            {items.map((c, i) => {
              const v = c.media.find((m) => m.type === "video");
              return (
                <button key={c.id} type="button" onClick={() => setClipIndex(i)} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
                  {v?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    v && <video src={`${v.url}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow">
                    <Play className="h-3.5 w-3.5 fill-white" /> {compactNumber(c.viewCount)}
                  </span>
                </button>
              );
            })}
          </div>
          <MoreButton {...feed} />
        </div>
      );
  else if (tab === "musica") content = items === null ? grid(3, "h-16 col-span-3") : <MusicTab items={items} done={feed.done} loading={feed.loading} more={feed.more} onOpen={setOpenPost} />;
  else content = items === null ? grid(3, "h-16 col-span-3") : <FilesTab items={items} done={feed.done} loading={feed.loading} more={feed.more} />;

  return (
    <section id="conteudo" className="space-y-3">
      <div className="sticky top-14 z-20 -mx-4 border-b border-white/[0.06] bg-space-bg/85 px-2 backdrop-blur-xl md:top-14 md:mx-0 md:rounded-2xl md:border md:px-1.5">
        <div className="flex gap-0.5 overflow-x-auto py-1.5 [scrollbar-width:none]" role="tablist" aria-label="Central de conteúdo">
          {CONTENT_TABS.map((t) => {
            const Icon = t.icon;
            const count = counts[t.id] ?? 0;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => (setTab(t.id), t.id !== "fotos" && setAlbum(null))}
                className={clsx(
                  "flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition",
                  tab === t.id ? "bg-orbit-gradient text-snow shadow-[0_0_16px_rgb(var(--app-accent,139_92_246)/0.35)]" : "text-white/60 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
                {count > 0 && <span className={clsx("text-[11px] tabular-nums", tab === t.id ? "text-snow/80" : "text-white/35")}>{compactNumber(count)}</span>}
              </button>
            );
          })}
          {customTabs.length > 0 && <span className="mx-1 my-2 w-px shrink-0 self-stretch bg-white/10" aria-hidden />}
          {customTabs.map((t) => {
            const id = `c:${t.id}`;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => (setTab(id), setAlbum(null))}
                className={clsx(
                  "flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition",
                  tab === id ? "bg-orbit-gradient text-snow shadow-[0_0_16px_rgb(var(--app-accent,139_92_246)/0.35)]" : "text-white/60 hover:text-white"
                )}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>
      {tab === "tudo" && header}
      {content}

      {photoView !== null && photoItems.length > 0 && (
        <Lightbox
          images={photoItems}
          start={photoView}
          onClose={() => setPhotoView(null)}
          caption={
            <button type="button" onClick={() => (setOpenPost(photoItems[photoView].post), setPhotoView(null))} className="inline-flex items-center gap-1.5 text-orbit-cyan">
              <MessageCircle className="h-4 w-4" /> Ver publicação, reações e comentários
            </button>
          }
        />
      )}
      {gifView !== null && gifItems.length > 0 && <Lightbox images={gifItems} start={gifView} onClose={() => setGifView(null)} />}
      {clipIndex !== null && items && tab === "clipes" && <ClipViewer clips={items} start={clipIndex} onClose={() => setClipIndex(null)} onOpenPost={setOpenPost} />}
      <Sheet open={!!openPost} onClose={() => setOpenPost(null)} wide title={openPost?.meta.video?.title || "Publicação"}>
        {openPost && (
          <CommunityPostCard
            post={openPost}
            highlight
            onChanged={(n) => feed.setItems((feed.items ?? []).map((x) => (x.id === n.id ? n : x)))}
            onDeleted={(id) => (setOpenPost(null), setClipIndex(null), feed.setItems((feed.items ?? []).filter((x) => x.id !== id)))}
          />
        )}
      </Sheet>
      <Confirm open={!!deleteAlbum} title="Excluir este álbum?" message="As fotos continuam na comunidade, só saem do álbum." confirmLabel="Excluir álbum" onConfirm={() => deleteAlbum && removeAlbum(deleteAlbum)} onClose={() => setDeleteAlbum(null)} />
    </section>
  );
}
