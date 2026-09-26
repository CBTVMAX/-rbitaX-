"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronRight,
  Clapperboard,
  Film,
  FolderPlus,
  Globe,
  Heart,
  Home,
  Images,
  Link2,
  Loader2,
  Lock,
  MessageCircle,
  MessagesSquare,
  Pin,
  Play,
  Plus,
  ScrollText,
  Search,
  Settings,
  Share2,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { CommunityJoinButton } from "@/components/community-join-button";
import { useStoreToast } from "@/components/store/store-view";
import { categoryLabel } from "@/lib/community-categories";
import { ago as timeAgo } from "@/lib/communities";
import {
  accentOf,
  communityError,
  compactNumber,
  rank,
  type Album,
  type Community,
  type CommunityPost,
  type Discussion,
  type Membership,
  type Role,
  type Viewer,
} from "@/lib/communities";
import { loadCommunityPosts } from "@/lib/community-data";
import { CommunityContext, type CommunityCtx } from "./context";
import { CommunityPostCard } from "./post-card";
import { Composer, CreateMenu, type CreateKind } from "./composer";
import { EmptyState, OfficialBadge, RoleBadge, Sheet } from "./ui";
import { Lightbox } from "./lightbox";

export type MemberPreview = { role: Role; createdAt: string; user: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean } };

type Tab = "inicio" | "posts" | "fotos" | "videos" | "clipes" | "discussoes" | "membros";
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "posts", label: "Posts", icon: ScrollText },
  { id: "fotos", label: "Fotos", icon: Camera },
  { id: "videos", label: "Vídeos", icon: Film },
  { id: "clipes", label: "Clipes", icon: Clapperboard },
  { id: "discussoes", label: "Discussões", icon: MessagesSquare },
  { id: "membros", label: "Membros", icon: Users },
];
const POST_KINDS = ["text", "link", "poll", "music", "file"];

function usePaged(load: (before?: string) => Promise<CommunityPost[]>, initial: CommunityPost[] | null, deps: unknown[]) {
  const [items, setItems] = useState<CommunityPost[] | null>(initial);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (initial) {
      setItems(initial);
      setDone(initial.length < 15);
      return;
    }
    let alive = true;
    setItems(null);
    load().then((r) => {
      if (!alive) return;
      setItems(r);
      setDone(r.length < 15);
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
    if (r.length < 15) setDone(true);
  };
  return { items, setItems, done, loading, more };
}

function Feed({ items, loading, done, more, setItems, empty, focusId }: {
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
      {!done && (
        <button type="button" onClick={more} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75 hover:bg-white/5">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Carregar mais
        </button>
      )}
    </div>
  );
}

function DiscussionRow({ d, slug }: { d: Discussion; slug: string }) {
  return (
    <Link
      href={`/comunidades/${slug}/discussoes/${d.id}`}
      className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-space-card/80 p-3.5 transition hover:border-orbit-purple/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orbit-purple/15 text-orbit-purple">
        <MessagesSquare className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {d.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />}
          <span className="truncate text-sm font-semibold text-white">{d.title}</span>
          {d.isClosed && <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-white/45">
          {d.author.name} · {d.replyCount} {d.replyCount === 1 ? "resposta" : "respostas"} · {timeAgo(d.lastActivityAt)}
        </span>
      </span>
      <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-white/30" />
    </Link>
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
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? (e.target as HTMLVideoElement).play().catch(() => {}) : (e.target as HTMLVideoElement).pause())),
      { root: el, threshold: 0.7 }
    );
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
                <video src={v.url} loop playsInline preload="metadata" className="h-full max-h-full w-full max-w-[min(100vw,56.25vh)] object-cover" onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())} />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
                <div className="mx-auto flex max-w-[min(100vw,56.25vh)] items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold text-white">
                      {c.author.name} {c.author.isVerified && <VerifiedBadge />}
                    </p>
                    {c.content && <p className="mt-1 line-clamp-3 text-sm text-white/85">{c.content}</p>}
                  </div>
                  <div className="pointer-events-auto flex flex-col items-center gap-3 text-white">
                    <button type="button" onClick={() => onOpenPost(c)} className="flex flex-col items-center text-[11px]">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                        <Heart className={clsx("h-5 w-5", c.likedByMe && "fill-orbit-pink text-orbit-pink")} />
                      </span>
                      {compactNumber(c.likeCount)}
                    </button>
                    <button type="button" onClick={() => onOpenPost(c)} className="flex flex-col items-center text-[11px]">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                        <MessageCircle className="h-5 w-5" />
                      </span>
                      {compactNumber(c.commentCount)}
                    </button>
                    <button type="button" onClick={() => onOpenPost(c)} className="flex flex-col items-center text-[11px]">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                        <Share2 className="h-5 w-5" />
                      </span>
                      Mais
                    </button>
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

export function CommunityView(props: {
  community: Community;
  viewer: Viewer;
  membership: Membership;
  canSee: boolean;
  initialTab: string;
  pinned: CommunityPost[];
  posts: CommunityPost[];
  focus: CommunityPost | null;
  discussions: Discussion[];
  albums: Album[];
  members: MemberPreview[];
  counts: { photos: number; videos: number; clips: number; discussions: number };
  staffBadges: { pending: number; requests: number; reports: number };
}) {
  const { community, viewer, membership, canSee } = props;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast, node } = useStoreToast();
  const [tab, setTab] = useState<Tab>((TABS.some((t) => t.id === props.initialTab) ? props.initialTab : "inicio") as Tab);
  const [role, setRole] = useState<Role | null>(membership.role);
  const [menu, setMenu] = useState(false);
  const [composer, setComposer] = useState<CreateKind | null>(null);
  const [albumTarget, setAlbumTarget] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pinned, setPinned] = useState(props.pinned);
  const [discussions, setDiscussions] = useState(props.discussions);
  const [albums, setAlbums] = useState(props.albums);
  const [album, setAlbum] = useState<string | null>(null);
  const [albumForm, setAlbumForm] = useState<{ id?: string; title: string; description: string } | null>(null);
  const [photoView, setPhotoView] = useState<number | null>(null);
  const [clipIndex, setClipIndex] = useState<number | null>(null);
  const [clipPost, setClipPost] = useState<CommunityPost | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const accent = accentOf(community.accentColor);
  const [fab, setFab] = useState(false);
  useEffect(() => {
    const onScroll = () => setFab(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctx: CommunityCtx = useMemo(
    () => ({ community, viewer, role, supabase, toast, refresh: () => (setRefreshKey((k) => k + 1), router.refresh()) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [community, viewer, role, supabase]
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "inicio") url.searchParams.delete("aba");
    else url.searchParams.set("aba", tab);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [tab]);

  const me = viewer?.id ?? null;
  const load = useCallback(
    (f: Parameters<typeof loadCommunityPosts>[3]) => (before?: string) => loadCommunityPosts(supabase, community.id, me, { ...f, before, limit: 15 }),
    [supabase, community.id, me]
  );
  const home = usePaged(load({ pinned: false, excludeKinds: ["clip"] }), refreshKey === 0 ? props.posts : null, [refreshKey]);
  const postsTab = usePaged(load({ kinds: POST_KINDS }), null, [tab === "posts", refreshKey]);
  const photos = usePaged(load({ kinds: ["image"], ...(album ? { albumId: album } : {}) }), null, [tab === "fotos", album, refreshKey]);
  const videos = usePaged(load({ kinds: ["video"] }), null, [tab === "videos", refreshKey]);
  const clips = usePaged(load({ kinds: ["clip"] }), null, [tab === "clipes", refreshKey]);

  const staff = rank(role) >= 2;
  const admin = rank(role) >= 3;
  const badgeTotal = props.staffBadges.pending + props.staffBadges.requests + props.staffBadges.reports;

  async function onCreated(r: { id: string; status: string; kind: CreateKind }) {
    if (r.status === "pending") toast("Enviado! A moderação vai revisar antes de aparecer.");
    if (r.kind === "discussion") {
      if (r.status === "visible") router.push(`/comunidades/${community.slug}/discussoes/${r.id}`);
      return;
    }
    setRefreshKey((k) => k + 1);
    const target: Tab = r.kind === "clip" ? "clipes" : r.kind === "video" ? "videos" : r.kind === "photo" ? "fotos" : "inicio";
    setTab(target);
    router.refresh();
  }

  async function saveAlbum() {
    if (!albumForm) return;
    const { data, error } = await supabase.rpc("community_save_album", {
      p_community: community.id,
      p_id: albumForm.id ?? null,
      p_title: albumForm.title,
      p_description: albumForm.description,
      p_cover: null,
    });
    if (error) return toast(communityError(error.message), true);
    const id = data as string;
    setAlbums((l) =>
      albumForm.id ? l.map((a) => (a.id === id ? { ...a, title: albumForm.title, description: albumForm.description } : a)) : [{ id, title: albumForm.title, description: albumForm.description, coverUrl: null, createdAt: new Date().toISOString() }, ...l]
    );
    setAlbumForm(null);
    toast(albumForm.id ? "Álbum atualizado." : "Álbum criado. Envie as primeiras fotos!");
  }

  async function deleteAlbum(id: string) {
    if (!window.confirm("Excluir este álbum? As fotos continuam na comunidade, só saem do álbum.")) return;
    const { error } = await supabase.rpc("community_delete_album", { p_album: id });
    if (error) return toast(communityError(error.message), true);
    setAlbums((l) => l.filter((a) => a.id !== id));
    setAlbum(null);
    toast("Álbum excluído.");
  }

  function share() {
    const url = `${window.location.origin}/comunidades/${community.slug}`;
    if (navigator.share) navigator.share({ title: community.name, url }).catch(() => {});
    else navigator.clipboard.writeText(url).then(() => toast("Link da comunidade copiado."));
  }

  const photoItems = (photos.items ?? []).flatMap((p) => p.media.filter((m) => m.type === "image").map((m) => ({ ...m, post: p })));
  const filteredMembers = props.members.filter(
    (m) => !memberQuery.trim() || m.user.name.toLowerCase().includes(memberQuery.toLowerCase()) || m.user.username.toLowerCase().includes(memberQuery.toLowerCase())
  );
  const staffMembers = props.members.filter((m) => m.role !== "member").sort((a, b) => rank(b.role) - rank(a.role));
  const canCreate = !!viewer && canSee && (rank(role) >= 1 || !community.isPrivate);

  const header = (
    <div className="relative">
      <div
        className="relative h-36 overflow-hidden sm:h-48 md:h-56 md:rounded-b-[32px] lg:mx-6 lg:mt-4 lg:rounded-[32px]"
        style={{ background: `linear-gradient(135deg, ${accent.from}, rgb(${accent.rgb}) 55%, ${accent.to})` }}
      >
        {community.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.35),transparent_55%)]" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-space-bg via-transparent to-transparent" />
        <Link href="/comunidades" aria-label="Voltar para comunidades" className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button type="button" onClick={share} aria-label="Compartilhar comunidade" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
          <Share2 className="h-[18px] w-[18px]" />
        </button>
      </div>
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-10">
        <div className="-mt-10 flex items-end gap-3 sm:-mt-12">
          <span className="relative shrink-0 rounded-[26px] p-[3px] shadow-[0_0_28px_rgb(var(--app-accent,139_92_246)/0.45)]" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[23px] bg-space-card text-2xl font-bold text-white sm:h-24 sm:w-24">
              {community.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                community.name.slice(0, 1).toUpperCase()
              )}
            </span>
          </span>
          <div className="hidden min-w-0 flex-1 pb-1 md:block">
            <div className="flex flex-wrap items-center justify-end gap-2">{actions()}</div>
          </div>
        </div>
        <div className="mt-3 min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-[22px] font-bold leading-tight text-white sm:text-2xl md:text-3xl">
            <span className="min-w-0 break-words">{community.name}</span>
            {community.isOfficial && <OfficialBadge />}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/55">
            <span>@{community.username}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              {community.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {community.isPrivate ? "Privada" : "Pública"}
            </span>
            {community.category && (
              <>
                <span aria-hidden>·</span>
                <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/60">{categoryLabel(community.category)}</span>
              </>
            )}
          </p>
          <button type="button" onClick={() => setTab("membros")} className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75 hover:text-white">
            <Users className="h-4 w-4 text-orbit-cyan" /> <strong className="font-semibold text-white">{compactNumber(community.memberCount)}</strong> {community.memberCount === 1 ? "membro" : "membros"}
            {role && <RoleBadge role={role} className="ml-1" />}
          </button>
          {community.description && (
            <div className="mt-2 max-w-2xl">
              <p className={clsx("whitespace-pre-wrap text-sm leading-relaxed text-white/70", !descOpen && "line-clamp-3")}>{community.description}</p>
              {community.description.length > 160 && (
                <button type="button" onClick={() => setDescOpen((v) => !v)} className="mt-0.5 text-xs font-semibold text-orbit-cyan">
                  {descOpen ? "Mostrar menos" : "Ler mais"}
                </button>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">{actions()}</div>
        </div>
      </div>
    </div>
  );

  function actions() {
    return (
      <>
        {viewer ? (
          <CommunityJoinButton
            communityId={community.id}
            initiallyMember={!!membership.role}
            isPrivate={community.isPrivate}
            role={role}
            request={membership.request}
            banned={membership.banned}
            notify={membership.notify}
            size="lg"
            onChange={(s) => setRole(s === "member" ? role ?? "member" : null)}
          />
        ) : (
          <Link href="/entrar" className="flex h-11 items-center rounded-full bg-orbit-gradient px-5 text-sm font-semibold text-snow shadow-glow">
            Entrar para participar
          </Link>
        )}
        {canCreate && (
          <button type="button" onClick={() => setMenu(true)} className="flex h-11 items-center gap-1.5 rounded-full border border-orbit-purple/40 bg-orbit-purple/10 px-5 text-sm font-semibold text-white transition hover:bg-orbit-purple/20">
            <Plus className="h-4 w-4" /> Criar
          </button>
        )}
        {staff && (
          <Link
            href={`/comunidades/${community.slug}/gerenciar`}
            className="relative flex h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            <Settings className="h-4 w-4" /> Gerenciar
            {badgeTotal > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orbit-pink px-1 text-[10px] font-bold text-snow">{badgeTotal}</span>}
          </Link>
        )}
      </>
    );
  }

  const tabs = (
    <div className="sticky top-14 z-20 -mx-4 border-b border-white/[0.06] bg-space-bg/85 px-2 backdrop-blur-xl md:top-16 md:mx-0 md:rounded-2xl md:border md:px-1.5">
      <div className="flex gap-0.5 overflow-x-auto py-1.5 [scrollbar-width:none]" role="tablist" aria-label="Seções da comunidade">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = t.id === "fotos" ? props.counts.photos : t.id === "videos" ? props.counts.videos : t.id === "clipes" ? props.counts.clips : t.id === "discussoes" ? props.counts.discussions : 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition",
                tab === t.id ? "bg-orbit-gradient text-snow shadow-[0_0_16px_rgb(var(--app-accent,139_92_246)/0.35)]" : "text-white/60 hover:text-white",
                t.id === "membros" && "lg:hidden"
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
              {count > 0 && <span className={clsx("text-[11px] tabular-nums", tab === t.id ? "text-snow/80" : "text-white/35")}>{compactNumber(count)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const locked = (
    <EmptyState
      icon={<Lock className="h-6 w-6" />}
      title={membership.banned ? "Você não tem acesso a esta comunidade" : "Comunidade privada"}
      text={membership.banned ? "A moderação bloqueou sua participação." : "Somente membros aprovados veem as publicações, fotos e discussões. Peça para entrar e aguarde a aprovação."}
    />
  );

  const composerPrompt = canCreate && (
    <button
      type="button"
      onClick={() => setMenu(true)}
      className="flex w-full items-center gap-3 rounded-3xl border border-white/[0.08] bg-space-card/80 p-3 text-left transition hover:border-orbit-purple/40"
    >
      <Avatar name={viewer!.name} url={viewer!.avatarUrl} size={40} />
      <span className="flex min-h-[44px] flex-1 items-center rounded-2xl border border-white/10 bg-space-bg/60 px-4 text-sm text-white/40">Compartilhe algo com a comunidade…</span>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow">
        <Plus className="h-5 w-5" />
      </span>
    </button>
  );

  let content: React.ReactNode;
  if (!canSee) content = locked;
  else if (tab === "inicio")
    content = (
      <div className="space-y-3">
        {composerPrompt}
        {props.focus && !pinned.some((p) => p.id === props.focus!.id) && <CommunityPostCard post={props.focus} highlight />}
        {pinned.map((p) => (
          <CommunityPostCard
            key={p.id}
            post={p}
            highlight={p.id === props.focus?.id}
            onChanged={(n) => setPinned((l) => (n.isPinned ? l.map((x) => (x.id === n.id ? n : x)) : l.filter((x) => x.id !== n.id)))}
            onDeleted={(id) => setPinned((l) => l.filter((x) => x.id !== id))}
          />
        ))}
        {discussions.length > 0 && (
          <section className="rounded-3xl border border-white/[0.08] bg-space-card/60 p-3.5 lg:hidden">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <MessagesSquare className="h-4 w-4 text-orbit-purple" /> Discussões ativas
              </h2>
              <button type="button" onClick={() => setTab("discussoes")} className="text-xs font-semibold text-orbit-cyan">
                Ver todas
              </button>
            </div>
            <div className="space-y-2">
              {discussions.slice(0, 2).map((d) => (
                <DiscussionRow key={d.id} d={d} slug={community.slug} />
              ))}
            </div>
          </section>
        )}
        <Feed
          {...home}
          setItems={home.setItems}
          focusId={props.focus?.id}
          empty={<EmptyState icon={<ScrollText className="h-6 w-6" />} title="Nenhuma publicação ainda" text={canCreate ? "Toque em + Criar para começar a conversa." : "Volte em breve para ver as novidades."} />}
        />
      </div>
    );
  else if (tab === "posts")
    content = (
      <div className="space-y-3">
        {composerPrompt}
        <Feed {...postsTab} setItems={postsTab.setItems} empty={<EmptyState icon={<ScrollText className="h-6 w-6" />} title="Sem posts por aqui" text="Textos, enquetes, links, músicas e arquivos aparecem nesta aba." />} />
      </div>
    );
  else if (tab === "fotos")
    content = (
      <div className="space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          <button
            type="button"
            onClick={() => setAlbum(null)}
            className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", album === null ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}
          >
            Todas as fotos
          </button>
          {albums.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAlbum(a.id)}
              className={clsx("shrink-0 rounded-full px-4 py-2 text-xs font-semibold", album === a.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}
            >
              <Images className="mr-1 inline h-3.5 w-3.5" /> {a.title}
            </button>
          ))}
          {admin && (
            <button type="button" onClick={() => setAlbumForm({ title: "", description: "" })} className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-white/20 px-4 py-2 text-xs font-semibold text-white/70 hover:text-white">
              <FolderPlus className="h-3.5 w-3.5" /> Novo álbum
            </button>
          )}
        </div>
        {album && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-space-card/60 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{albums.find((a) => a.id === album)?.title}</p>
              {albums.find((a) => a.id === album)?.description && <p className="text-xs text-white/50">{albums.find((a) => a.id === album)?.description}</p>}
            </div>
            {canCreate && (
              <button type="button" onClick={() => (setAlbumTarget(album), setComposer("photo"))} className="flex h-10 items-center gap-1.5 rounded-full bg-orbit-gradient px-4 text-xs font-semibold text-snow">
                <Plus className="h-4 w-4" /> Enviar fotos
              </button>
            )}
            {admin && (
              <>
                <button type="button" onClick={() => { const a = albums.find((x) => x.id === album)!; setAlbumForm({ id: a.id, title: a.title, description: a.description }); }} className="h-10 rounded-full border border-white/10 px-4 text-xs font-semibold text-white/80">
                  Editar
                </button>
                <button type="button" onClick={() => deleteAlbum(album)} className="h-10 rounded-full border border-red-400/30 px-4 text-xs font-semibold text-red-300">
                  Excluir
                </button>
              </>
            )}
          </div>
        )}
        {photos.items === null ? (
          <div className="grid grid-cols-3 gap-1 md:grid-cols-4">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : photoItems.length === 0 ? (
          <EmptyState
            icon={<Camera className="h-6 w-6" />}
            title="Nenhuma foto ainda"
            action={canCreate ? <button type="button" onClick={() => (setAlbumTarget(album), setComposer("photo"))} className="rounded-full bg-orbit-gradient px-5 py-2.5 text-xs font-semibold text-snow">Enviar fotos</button> : undefined}
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
            {!photos.done && (
              <button type="button" onClick={photos.more} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/75">
                {photos.loading && <Loader2 className="h-4 w-4 animate-spin" />} Carregar mais
              </button>
            )}
          </>
        )}
      </div>
    );
  else if (tab === "videos")
    content = <Feed {...videos} setItems={videos.setItems} empty={<EmptyState icon={<Film className="h-6 w-6" />} title="Nenhum vídeo ainda" />} />;
  else if (tab === "clipes")
    content =
      clips.items === null ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : clips.items.length === 0 ? (
        <EmptyState icon={<Clapperboard className="h-6 w-6" />} title="Nenhum clipe ainda" text="Clipes são vídeos verticais curtos, feitos para o celular." />
      ) : (
        <div className="grid grid-cols-3 gap-1 md:grid-cols-4">
          {clips.items.map((c, i) => {
            const v = c.media.find((m) => m.type === "video");
            return (
              <button key={c.id} type="button" onClick={() => setClipIndex(i)} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                {v && <video src={`${v.url}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />}
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow">
                  <Play className="h-3.5 w-3.5 fill-white" /> {compactNumber(c.viewCount)}
                </span>
              </button>
            );
          })}
        </div>
      );
  else if (tab === "discussoes")
    content = (
      <div className="space-y-2.5">
        {viewer && rank(role) >= 1 && (
          <button type="button" onClick={() => setComposer("discussion")} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-orbit-purple/40 text-sm font-semibold text-white hover:bg-orbit-purple/[0.06]">
            <Plus className="h-4 w-4" /> Criar tópico
          </button>
        )}
        {discussions.length === 0 ? (
          <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="Nenhuma discussão ainda" text="Abra um tópico, por exemplo: “Quais recursos vocês querem no Órbita X?”" />
        ) : (
          discussions.map((d) => <DiscussionRow key={d.id} d={d} slug={community.slug} />)
        )}
      </div>
    );
  else
    content = (
      <div className="space-y-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-space-card/70 px-4 py-2.5">
          <Search className="h-4 w-4 text-white/40" />
          <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Buscar membros" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
        </label>
        <div className="divide-y divide-white/[0.05] overflow-hidden rounded-3xl border border-white/[0.08] bg-space-card/70">
          {filteredMembers.map((m) => (
            <Link key={m.user.id} href={`/perfil/${m.user.username}`} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03]">
              <Avatar name={m.user.name} url={m.user.avatarUrl} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-sm font-semibold text-white">
                  {m.user.name} {m.user.isVerified && <VerifiedBadge />}
                </span>
                <span className="block truncate text-xs text-white/45">@{m.user.username}</span>
              </span>
              <RoleBadge role={m.role} />
            </Link>
          ))}
          {filteredMembers.length === 0 && <p className="p-6 text-center text-sm text-white/45">Ninguém encontrado.</p>}
        </div>
        {community.memberCount > props.members.length && <p className="text-center text-xs text-white/40">Mostrando {props.members.length} de {community.memberCount} membros.</p>}
      </div>
    );

  const sidebar = (
    <aside className="hidden space-y-3 lg:block">
      {staff && (
        <Link
          href={`/comunidades/${community.slug}/gerenciar`}
          className="block rounded-3xl border border-orbit-purple/30 bg-[linear-gradient(135deg,rgb(var(--app-accent,139_92_246)/0.18),transparent_70%)] p-4 transition hover:border-orbit-purple/60"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Settings className="h-4 w-4" /> Gerenciar comunidade
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              ["Pendentes", props.staffBadges.pending],
              ["Pedidos", props.staffBadges.requests],
              ["Denúncias", props.staffBadges.reports],
            ].map(([l, v]) => (
              <span key={l as string} className="rounded-2xl bg-black/20 py-2">
                <span className={clsx("block font-display text-lg font-bold", (v as number) > 0 ? "text-orbit-pink" : "text-white")}>{v as number}</span>
                <span className="block text-[10px] uppercase tracking-wide text-white/45">{l as string}</span>
              </span>
            ))}
          </div>
        </Link>
      )}
      <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
        <h2 className="text-sm font-semibold text-white">Sobre</h2>
        {community.description && <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-white/65">{community.description}</p>}
        <ul className="mt-3 space-y-2 text-xs text-white/55">
          <li className="flex items-center gap-2">
            {community.isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            {community.isPrivate ? "Privada · só membros veem o conteúdo" : "Pública · qualquer pessoa pode ver e participar"}
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Criada em {new Date(community.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </li>
        </ul>
        {community.rules && (
          <details className="mt-3 rounded-2xl bg-white/[0.03] p-3 text-xs text-white/65">
            <summary className="cursor-pointer font-semibold text-white/80">Regras</summary>
            <p className="mt-2 whitespace-pre-wrap">{community.rules}</p>
          </details>
        )}
      </section>
      {canSee && (
        <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Membros · {compactNumber(community.memberCount)}</h2>
          </div>
          {staffMembers.length > 0 && (
            <div className="mt-3 space-y-2">
              {staffMembers.slice(0, 4).map((m) => (
                <Link key={m.user.id} href={`/perfil/${m.user.username}`} className="flex items-center gap-2.5">
                  <Avatar name={m.user.name} url={m.user.avatarUrl} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm text-white/85">{m.user.name}</span>
                  <RoleBadge role={m.role} />
                </Link>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {props.members.filter((m) => m.role === "member").slice(0, 16).map((m) => (
              <Link key={m.user.id} href={`/perfil/${m.user.username}`} title={m.user.name}>
                <Avatar name={m.user.name} url={m.user.avatarUrl} size={34} />
              </Link>
            ))}
          </div>
        </section>
      )}
      {canSee && discussions.length > 0 && (
        <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Discussões</h2>
            <button type="button" onClick={() => setTab("discussoes")} className="text-xs font-semibold text-orbit-cyan">
              Ver todas
            </button>
          </div>
          <ul className="space-y-2">
            {discussions.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Link href={`/comunidades/${community.slug}/discussoes/${d.id}`} className="block rounded-xl px-2 py-1.5 hover:bg-white/[0.04]">
                  <span className="line-clamp-2 text-sm text-white/85">{d.title}</span>
                  <span className="text-[11px] text-white/40">{d.replyCount} respostas</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-white">Atalhos</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {TABS.filter((t) => t.id !== "inicio" && t.id !== "membros").map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-white/70 transition hover:bg-white/[0.05] hover:text-white">
                <Icon className="h-4 w-4 text-orbit-cyan" /> {t.label}
              </button>
            );
          })}
        </div>
      </section>
      {community.links.length > 0 && (
        <section className="rounded-3xl border border-white/[0.08] bg-space-card/70 p-4">
          <h2 className="mb-2 text-sm font-semibold text-white">Links</h2>
          <ul className="space-y-1">
            {community.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-white/80 hover:bg-white/[0.04] hover:text-white">
                  <Link2 className="h-4 w-4 shrink-0 text-orbit-cyan" /> <span className="truncate">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );

  return (
    <CommunityContext.Provider value={ctx}>
      <div style={{ ["--app-accent" as string]: accent.rgb }}>
        {header}
        {staff && badgeTotal > 0 && (
          <div className="mx-auto mt-3 max-w-6xl px-4 md:px-6 lg:hidden">
            <Link href={`/comunidades/${community.slug}/gerenciar?secao=moderacao`} className="flex items-center gap-2 rounded-2xl border border-orbit-pink/30 bg-orbit-pink/[0.06] px-3 py-2.5 text-xs text-white/85">
              <ShieldAlert className="h-4 w-4 text-orbit-pink" />
              {[
                props.staffBadges.pending && `${props.staffBadges.pending} aguardando aprovação`,
                props.staffBadges.requests && `${props.staffBadges.requests} ${props.staffBadges.requests === 1 ? "pedido" : "pedidos"} para entrar`,
                props.staffBadges.reports && `${props.staffBadges.reports} ${props.staffBadges.reports === 1 ? "denúncia" : "denúncias"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              <ChevronRight className="ml-auto h-4 w-4" />
            </Link>
          </div>
        )}
        <div className="mx-auto mt-4 max-w-6xl px-4 pb-10 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:px-10">
          <div className="min-w-0 space-y-4">
            {canSee && tabs}
            {content}
          </div>
          {sidebar}
        </div>

        {canCreate && fab && (
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Criar"
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-[0_10px_30px_rgb(var(--app-accent,139_92_246)/0.55)] animate-pop-in transition active:scale-95 md:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        <CreateMenu open={menu} onClose={() => setMenu(false)} onPick={(k) => (setMenu(false), setAlbumTarget(null), setComposer(k))} />
        <Composer kind={composer} onClose={() => setComposer(null)} onCreated={onCreated} albums={albums} defaultAlbum={albumTarget} />

        <Sheet open={!!albumForm} onClose={() => setAlbumForm(null)} title={albumForm?.id ? "Editar álbum" : "Novo álbum"}>
          {albumForm && (
            <div className="space-y-3 pt-1">
              <input
                value={albumForm.title}
                onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                maxLength={80}
                placeholder="Nome do álbum"
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
              />
              <textarea
                value={albumForm.description}
                onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                maxLength={500}
                rows={3}
                placeholder="Descrição (opcional)"
                className="w-full resize-none rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
              />
              <button type="button" onClick={saveAlbum} disabled={!albumForm.title.trim()} className="w-full rounded-full bg-orbit-gradient py-3 text-sm font-semibold text-snow disabled:opacity-50">
                Salvar álbum
              </button>
            </div>
          )}
        </Sheet>

        {photoView !== null && photoItems.length > 0 && (
          <Lightbox
            images={photoItems}
            start={photoView}
            onClose={() => setPhotoView(null)}
            caption={
              <Link href={`/comunidades/${community.slug}?post=${photoItems[photoView]?.post.id}`} onClick={() => setPhotoView(null)} className="inline-flex items-center gap-1.5 text-orbit-cyan">
                <MessageCircle className="h-4 w-4" /> Ver publicação, reações e comentários
              </Link>
            }
          />
        )}
        {clipIndex !== null && clips.items && <ClipViewer clips={clips.items} start={clipIndex} onClose={() => setClipIndex(null)} onOpenPost={setClipPost} />}
        <Sheet open={!!clipPost} onClose={() => setClipPost(null)} wide title="Clipe">
          {clipPost && (
            <CommunityPostCard
              post={clipPost}
              highlight
              onChanged={(n) => clips.setItems((clips.items ?? []).map((x) => (x.id === n.id ? n : x)))}
              onDeleted={(id) => (setClipPost(null), setClipIndex(null), clips.setItems((clips.items ?? []).filter((x) => x.id !== id)))}
            />
          )}
        </Sheet>
        {node}
      </div>
    </CommunityContext.Provider>
  );
}
