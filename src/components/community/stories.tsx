"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  BarChart3,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Link2,
  Loader2,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
  Type,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Avatar } from "@/components/post-card";
import { videoPoster } from "@/lib/media-thumb";
import { accentOf, ago, can, checkFile, ACCEPT, communityError, isEditorOrAdmin, parseDbDate, rank, STORY_COLUMNS, uploadCommunityFile, type UploadKind } from "@/lib/communities";
import { useCommunity } from "./context";
import { Confirm, Sheet } from "./ui";

// ── Model ───────────────────────────────────────────────────────────────────
export type StoryType = "image" | "video" | "text" | "music" | "poll" | "link";
export type Story = {
  id: string;
  userId: string;
  asCommunity: boolean;
  type: StoryType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  text: string | null;
  meta: {
    background?: string;
    poll?: { question: string; options: string[] };
    link?: { url: string; title: string };
    music?: { title: string; artist: string };
  };
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  user: { id: string; name: string; username: string; avatarUrl: string | null };
};
export type StoryGroup = { key: string; name: string; avatarUrl: string | null; community: boolean; stories: Story[]; seen: boolean };

export { STORY_COLUMNS } from "@/lib/communities";

export const STORY_BACKGROUNDS: { id: string; css: string }[] = [
  { id: "orbita", css: "linear-gradient(160deg,#1e1b4b 0%,#6d28d9 45%,#db2777 100%)" },
  { id: "aurora", css: "linear-gradient(160deg,#022c22 0%,#059669 45%,#22d3ee 100%)" },
  { id: "nebula", css: "linear-gradient(160deg,#0f172a 0%,#3b82f6 50%,#a855f7 100%)" },
  { id: "solar", css: "linear-gradient(160deg,#431407 0%,#f59e0b 50%,#ef4444 100%)" },
  { id: "magenta", css: "linear-gradient(160deg,#500724 0%,#ec4899 50%,#8b5cf6 100%)" },
  { id: "cosmos", css: "radial-gradient(circle at 30% 20%,#312e81 0%,#05060f 70%)" },
];
export const backgroundOf = (id?: string) => (STORY_BACKGROUNDS.find((b) => b.id === id) ?? STORY_BACKGROUNDS[0]).css;

const STORY_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👏"];
const IMAGE_MS = 6000;

/** Stories of a community grouped as the strip shows them: the community's own first, then each author; unseen first. */
export function groupStories(stories: Story[], seen: Set<string>, community: { name: string; avatarUrl: string | null }): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const s of stories) {
    const key = s.asCommunity ? "community" : s.userId;
    const g = map.get(key) ?? { key, name: s.asCommunity ? community.name : s.user.name, avatarUrl: s.asCommunity ? community.avatarUrl : s.user.avatarUrl, community: s.asCommunity, stories: [], seen: true };
    g.stories.push(s);
    if (!seen.has(s.id)) g.seen = false;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => Number(b.community) - Number(a.community) || Number(a.seen) - Number(b.seen));
}

export async function loadActiveStories(supabase: ReturnType<typeof useCommunity>["supabase"], communityId: string, me: string | null) {
  const { data } = await supabase
    .from("Moment")
    .select(STORY_COLUMNS)
    .eq("communityId", communityId)
    .gt("expiresAt", new Date().toISOString())
    .order("createdAt", { ascending: true })
    .limit(100);
  const stories = ((data ?? []) as unknown as Story[]).filter((s) => s.user);
  let seen = new Set<string>();
  if (me && stories.length) {
    const { data: views } = await supabase.from("MomentView").select("momentId").eq("userId", me).in("momentId", stories.map((s) => s.id));
    seen = new Set((views ?? []).map((v) => v.momentId));
    stories.filter((s) => s.userId === me).forEach((s) => seen.add(s.id));
  }
  return { stories, seen };
}

// ── Strip ───────────────────────────────────────────────────────────────────
function Ring({ seen, children, size = 68 }: { seen: boolean; children: React.ReactNode; size?: number }) {
  return (
    <span
      className={clsx("flex items-center justify-center rounded-full p-[2.5px]", seen ? "bg-white/15" : "bg-[conic-gradient(from_210deg,#22d3ee,#3b82f6,#8b5cf6,#ec4899,#22d3ee)] shadow-[0_0_18px_rgb(var(--app-accent,139_92_246)/0.45)]")}
      style={{ width: size, height: size }}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[2.5px] border-space-bg bg-space-card">{children}</span>
    </span>
  );
}

export function StoriesStrip({ canSee }: { canSee: boolean }) {
  const { supabase, community, viewer, role, membership } = useCommunity();
  const [stories, setStories] = useState<Story[] | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ g: number; i: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const me = viewer?.id ?? null;
  const canCreate = !!viewer && can(community, role, "story") && !membership?.muted;

  const reload = useCallback(async () => {
    const r = await loadActiveStories(supabase, community.id, me);
    setStories(r.stories);
    setSeen(r.seen);
  }, [supabase, community.id, me]);

  useEffect(() => {
    if (canSee) reload();
  }, [canSee, reload]);

  // Deep link from notifications or Momentos: ?story=<id>
  const groups = useMemo(() => groupStories(stories ?? [], seen, community), [stories, seen, community]);
  useEffect(() => {
    if (!stories?.length) return;
    const id = new URLSearchParams(window.location.search).get("story");
    if (!id) return;
    const g = groups.findIndex((x) => x.stories.some((s) => s.id === id));
    if (g >= 0) setOpen({ g, i: groups[g].stories.findIndex((s) => s.id === id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories]);

  if (!canSee || (stories !== null && !stories.length && !canCreate)) return null;
  const accent = accentOf(community.accentColor);

  return (
    <section aria-label="Histórias" className="-mx-4 md:mx-0">
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] md:px-0">
        {canCreate && (
          <button type="button" onClick={() => setCreating(true)} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center">
            <span className="relative">
              <Ring seen>
                {isEditorOrAdmin(role) && community.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : viewer ? (
                  <Avatar name={viewer.name} url={viewer.avatarUrl} size={58} />
                ) : null}
              </Ring>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-space-bg bg-orbit-gradient text-snow">
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </span>
            <span className="w-full truncate text-[11px] font-medium text-white/80">Criar história</span>
          </button>
        )}
        {stories === null
          ? [0, 1, 2, 3].map((i) => (
              <span key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
                <span className="h-[68px] w-[68px] animate-pulse rounded-full bg-white/[0.06]" />
                <span className="h-2.5 w-12 animate-pulse rounded bg-white/[0.06]" />
              </span>
            ))
          : groups.map((g, gi) => (
              <button key={g.key} type="button" onClick={() => setOpen({ g: gi, i: Math.max(0, g.stories.findIndex((s) => !seen.has(s.id))) })} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center">
                <Ring seen={g.seen}>
                  {g.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
                      {g.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </Ring>
                <span className={clsx("w-full truncate text-[11px]", g.seen ? "text-white/50" : "font-semibold text-white")}>{g.community ? "Comunidade" : g.name.split(" ")[0]}</span>
              </button>
            ))}
      </div>
      {open && (
        <StoryViewer
          groups={groups}
          start={open}
          onClose={() => {
            setOpen(null);
            const url = new URL(window.location.href);
            if (url.searchParams.has("story")) {
              url.searchParams.delete("story");
              window.history.replaceState(window.history.state, "", url.toString());
            }
          }}
          onSeen={(id) => setSeen((s) => (s.has(id) ? s : new Set(s).add(id)))}
          onDeleted={(id) => setStories((l) => (l ?? []).filter((s) => s.id !== id))}
        />
      )}
      <StoryComposer open={creating} onClose={() => setCreating(false)} onCreated={reload} />
    </section>
  );
}

// ── Viewer ──────────────────────────────────────────────────────────────────
type Viewer = { userId: string; name: string; username: string; avatarUrl: string | null; emoji: string | null; viewedAt: string };

export function StoryViewer({
  groups,
  start,
  onClose,
  onSeen,
  onDeleted,
  archive = false,
}: {
  groups: StoryGroup[];
  start: { g: number; i: number };
  onClose: () => void;
  onSeen?: (id: string) => void;
  onDeleted?: (id: string) => void;
  archive?: boolean;
}) {
  const { supabase, community, viewer, role, toast } = useCommunity();
  const router = useRouter();
  const [pos, setPos] = useState(start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [viewers, setViewers] = useState<Viewer[] | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [myReaction, setMyReaction] = useState<Record<string, string>>({});
  const [poll, setPoll] = useState<Record<string, { counts: number[]; mine: number | null }>>({});
  const [duration, setDuration] = useState(IMAGE_MS);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const group = groups[pos.g];
  const story = group?.stories[pos.i];
  const mine = !!story && story.userId === viewer?.id;
  const staff = rank(role) >= 3 || role === "editor";
  const expired = !!story && parseDbDate(story.expiresAt).getTime() <= Date.now();
  const interactive = !!viewer && !mine && !archive && !expired;
  const stopped = paused || held || menu || showViewers || confirmDelete || reply.length > 0;

  // Decided from the current position (never inside a state updater, so closing is a normal event).
  const posRef = useRef(pos);
  posRef.current = pos;
  const next = useCallback(() => {
    const p = posRef.current;
    const g = groups[p.g];
    if (g && p.i + 1 < g.stories.length) setPos({ g: p.g, i: p.i + 1 });
    else if (p.g + 1 < groups.length) setPos({ g: p.g + 1, i: 0 });
    else onClose();
  }, [groups, onClose]);
  const prev = useCallback(() => {
    const p = posRef.current;
    if (p.i > 0) setPos({ g: p.g, i: p.i - 1 });
    else if (p.g > 0) setPos({ g: p.g - 1, i: groups[p.g - 1].stories.length - 1 });
  }, [groups]);

  // Lock the page behind, keyboard navigation (a sheet open on top handles its own Escape).
  const overlay = useRef(false);
  overlay.current = menu || showViewers || confirmDelete;
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || overlay.current) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") setPaused((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [next, prev, onClose]);

  // New story on screen: reset timer, count the view, load poll results.
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setDuration(story.type === "music" ? 15000 : IMAGE_MS);
    setViewers(null);
    if (!mine && viewer && !archive) {
      supabase.rpc("story_view", { p_moment: story.id }).then(() => {});
    }
    onSeen?.(story.id);
    if (story.type === "poll") {
      supabase.rpc("story_poll_results", { p_moment: story.id }).then(({ data }) => {
        if (data) setPoll((p) => ({ ...p, [story.id]: data as { counts: number[]; mine: number | null } }));
      });
    }
    if (viewer && !mine) {
      supabase
        .from("MomentReaction")
        .select("emoji")
        .eq("momentId", story.id)
        .eq("userId", viewer.id)
        .maybeSingle()
        .then(({ data }) => data && setMyReaction((r) => ({ ...r, [story.id]: data.emoji })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // Timer (videos follow their own playback). Elapsed time survives pauses; each story advances once.
  const elapsed = useRef(0);
  const advanced = useRef(false);
  useEffect(() => {
    elapsed.current = 0;
    advanced.current = false;
  }, [story?.id]);
  useEffect(() => {
    if (!story || story.type === "video" || stopped) return;
    let last = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      elapsed.current += t - last;
      last = t;
      const p = Math.min(1, elapsed.current / duration);
      setProgress(p);
      if (p >= 1) {
        if (!advanced.current) {
          advanced.current = true;
          next();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story, stopped, duration, next]);

  useEffect(() => {
    const v = video.current;
    const a = audio.current;
    if (v) (stopped ? v.pause() : v.play().catch(() => {}));
    if (a) (stopped ? a.pause() : a.play().catch(() => {}));
  }, [stopped, story?.id]);

  if (!group || !story) return null;

  async function react(emoji: string) {
    if (!story) return;
    const same = myReaction[story.id] === emoji;
    setMyReaction((r) => ({ ...r, [story.id]: same ? "" : emoji }));
    const { error } = await supabase.rpc("story_react", { p_moment: story.id, p_emoji: same ? null : emoji });
    if (error) return toast(communityError(error.message), true);
    if (!same) toast(`Você reagiu ${emoji}`);
  }

  async function vote(i: number) {
    if (!story || !interactive) return;
    const { data, error } = await supabase.rpc("story_vote", { p_moment: story.id, p_option: i });
    if (error) return toast(communityError(error.message), true);
    setPoll((p) => ({ ...p, [story.id]: data as { counts: number[]; mine: number | null } }));
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !story || !viewer) return;
    setSending(true);
    // Stories published as the community are answered in the member's chat with the administration;
    // a member's own story is answered in a direct message (friends only, as everywhere in the Messenger).
    const conv = story.asCommunity
      ? await supabase.rpc("community_open_chat", { p_community: community.id })
      : await supabase.rpc("get_or_create_dm", { other_user_id: story.userId });
    if (conv.error || !conv.data) {
      setSending(false);
      return toast(
        story.asCommunity ? communityError(conv.error?.message) : "Você só pode responder histórias de amigos. Envie um pedido de amizade primeiro.",
        true
      );
    }
    const preview = story.text?.slice(0, 80) || { image: "Foto", video: "Vídeo", text: "Texto", music: story.meta.music?.title ?? "Música", poll: story.meta.poll?.question ?? "Enquete", link: "Link" }[story.type];
    const { error } = await supabase.from("Message").insert({
      id: crypto.randomUUID(),
      conversationId: conv.data as string,
      senderId: viewer.id,
      content: text,
      type: "text",
      meta: { storyReply: { id: story.id, slug: community.slug, community: community.name, preview, thumb: story.thumbnailUrl ?? (story.type === "image" ? story.mediaUrl : null) } },
    });
    setSending(false);
    if (error) return toast("Não foi possível enviar a resposta.", true);
    setReply("");
    toast("Resposta enviada no Messenger.");
  }

  async function openViewers() {
    if (!story) return;
    setShowViewers(true);
    const { data, error } = await supabase.rpc("story_viewers", { p_moment: story.id });
    if (error) return toast(communityError(error.message), true);
    setViewers((data ?? []) as Viewer[]);
  }

  async function remove() {
    if (!story) return;
    const { error } = await supabase.rpc("story_delete", { p_moment: story.id });
    setConfirmDelete(false);
    if (error) return toast(communityError(error.message), true);
    toast("História excluída.");
    onDeleted?.(story.id);
    if (group.stories.length === 1 && groups.length === 1) onClose();
    else next();
  }

  const bg = backgroundOf(story.meta.background);
  const pollRes = poll[story.id];
  const totalVotes = pollRes ? pollRes.counts.reduce((a, b) => a + b, 0) : 0;
  const voted = pollRes?.mine !== null && pollRes?.mine !== undefined;

  let body: React.ReactNode;
  if (story.type === "image" && story.mediaUrl)
    body = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={story.mediaUrl} alt={story.text ?? ""} className="h-full w-full object-contain" draggable={false} />
    );
  else if (story.type === "video" && story.mediaUrl)
    body = (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={video}
        key={story.id}
        src={story.mediaUrl}
        poster={story.thumbnailUrl ?? undefined}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-contain"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgress(v.currentTime / Math.min(v.duration, 60));
          if (v.currentTime >= 60 && !advanced.current) {
            advanced.current = true;
            next();
          }
        }}
        onEnded={() => {
          if (!advanced.current) {
            advanced.current = true;
            next();
          }
        }}
      />
    );
  else
    body = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-8 text-center" style={{ background: bg }}>
        {story.type === "music" && (
          <>
            <span className="flex h-40 w-40 animate-[spin_8s_linear_infinite] items-center justify-center rounded-full bg-[radial-gradient(circle,#111_18%,#222_19%,#0b0b0b_60%,#1f1f1f_61%)] shadow-[0_0_60px_rgba(255,255,255,0.15)]" style={{ animationPlayState: stopped ? "paused" : "running" }}>
              <Music2 className="h-10 w-10 text-white/80" />
            </span>
            <div>
              <p className="text-xl font-bold text-white">{story.meta.music?.title ?? "Música"}</p>
              {story.meta.music?.artist && <p className="text-sm text-white/70">{story.meta.music.artist}</p>}
            </div>
            {story.mediaUrl && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio ref={audio} key={story.id} src={story.mediaUrl} autoPlay muted={muted} onLoadedMetadata={(e) => setDuration(Math.min(30, Math.max(8, e.currentTarget.duration || 15)) * 1000)} />
            )}
          </>
        )}
        {story.text && <p className={clsx("whitespace-pre-wrap break-words font-display font-bold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]", story.text.length > 120 ? "text-xl" : "text-3xl")}>{story.text}</p>}
        {story.type === "poll" && story.meta.poll && (
          <div className="w-full max-w-sm rounded-3xl bg-black/25 p-4 text-left backdrop-blur-md" onPointerDown={(e) => e.stopPropagation()}>
            <p className="mb-3 text-center text-base font-bold text-white">{story.meta.poll.question}</p>
            <div className="space-y-2">
              {story.meta.poll.options.map((o, i) => {
                const pct = totalVotes ? Math.round(((pollRes?.counts[i] ?? 0) / totalVotes) * 100) : 0;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!interactive}
                    onClick={() => vote(i)}
                    className={clsx(
                      "relative flex min-h-[48px] w-full items-center overflow-hidden rounded-2xl border px-4 text-left text-sm font-semibold text-white transition",
                      pollRes?.mine === i ? "border-white" : "border-white/30",
                      interactive && "active:scale-[0.98]"
                    )}
                  >
                    {(voted || mine || !interactive) && <span className="absolute inset-y-0 left-0 bg-white/25 transition-all" style={{ width: `${pct}%` }} />}
                    <span className="relative flex-1">{o}</span>
                    {(voted || mine || !interactive) && <span className="relative text-xs tabular-nums">{pct}%</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[11px] text-white/70">{totalVotes === 1 ? "1 voto" : `${totalVotes} votos`}</p>
          </div>
        )}
        {story.type === "link" && story.meta.link && (
          <a
            href={story.meta.link.url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setPaused(true)}
            className="flex w-full max-w-sm items-center gap-3 rounded-2xl bg-white p-3 text-left text-space-bg shadow-xl"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orbit-gradient text-snow">
              <Link2 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{story.meta.link.title || (() => { try { return new URL(story.meta.link!.url).hostname.replace(/^www\./, ""); } catch { return "Abrir link"; } })()}</span>
              <span className="block truncate text-xs text-black/55">{story.meta.link.url}</span>
            </span>
          </a>
        )}
      </div>
    );

  const author = group.community ? { name: community.name, avatarUrl: community.avatarUrl } : { name: story.user.name, avatarUrl: story.user.avatarUrl };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black" role="dialog" aria-label={`História de ${author.name}`}>
      <div className="relative h-full w-full max-w-[min(100vw,56.25vh)] overflow-hidden md:h-[92vh] md:rounded-3xl">
        {/* Content + tap zones */}
        <div
          className="absolute inset-0 select-none"
          onPointerDown={() => setHeld(true)}
          onPointerUp={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
        >
          {body}
          {story.text && (story.type === "image" || story.type === "video") && (
            <p className="absolute inset-x-0 bottom-28 mx-4 whitespace-pre-wrap break-words rounded-2xl bg-black/45 px-4 py-2.5 text-center text-sm text-white backdrop-blur">{story.text}</p>
          )}
          <button type="button" aria-label="História anterior" onClick={prev} className="absolute inset-y-16 left-0 w-1/3" />
          <button type="button" aria-label="Próxima história" onClick={next} className="absolute inset-y-16 right-0 w-1/3" />
        </div>

        {/* Top: progress + author */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {group.stories.map((s, i) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <span className="block h-full bg-white" style={{ width: `${i < pos.i ? 100 : i === pos.i ? Math.min(100, progress * 100) : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="pointer-events-auto mt-3 flex items-center gap-2.5">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/30">
              {author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Avatar name={author.name} url={null} size={36} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{author.name}</span>
              <span className="block truncate text-[11px] text-white/70">
                {ago(story.createdAt)}
                {group.community && ` · por ${story.user.name}`}
                {expired && " · expirada"}
              </span>
            </span>
            {(story.type === "video" || story.type === "music") && (
              <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Ativar som" : "Silenciar"} className="flex h-10 w-10 items-center justify-center rounded-full text-white">
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            <button type="button" onClick={() => setPaused((v) => !v)} aria-label={paused ? "Continuar" : "Pausar"} className="hidden h-10 w-10 items-center justify-center rounded-full text-white md:flex">
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            {(mine || staff || rank(role) >= 2) && (
              <button type="button" onClick={() => setMenu(true)} aria-label="Opções da história" className="flex h-10 w-10 items-center justify-center rounded-full text-white">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Bottom: reply + reactions, or insights for the author/team */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-10">
          {interactive ? (
            <>
              <div className="mb-2 flex justify-center gap-1.5">
                {STORY_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => react(e)}
                    aria-label={`Reagir ${e}`}
                    aria-pressed={myReaction[story.id] === e}
                    className={clsx("flex h-11 w-11 items-center justify-center rounded-full text-2xl transition active:scale-90", myReaction[story.id] === e ? "bg-white/25 ring-2 ring-white/70" : "bg-white/10 hover:bg-white/20")}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={1000}
                  placeholder={story.asCommunity ? `Responder a ${community.name}…` : `Responder a ${story.user.name.split(" ")[0]}…`}
                  className="min-h-[46px] min-w-0 flex-1 rounded-full border border-white/40 bg-black/30 px-4 text-sm text-white outline-none backdrop-blur placeholder:text-white/65 focus:border-white"
                />
                <button type="submit" disabled={!reply.trim() || sending} aria-label="Enviar resposta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-space-bg disabled:opacity-40">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          ) : mine || staff ? (
            <button type="button" onClick={openViewers} className="mx-auto flex min-h-[44px] items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold text-white backdrop-blur">
              <Eye className="h-4 w-4" /> {story.viewCount} {story.viewCount === 1 ? "visualização" : "visualizações"}
              {story.type === "poll" && <BarChart3 className="h-4 w-4" />}
            </button>
          ) : null}
        </div>

        {pos.g > 0 && (
          <button type="button" onClick={() => setPos({ g: pos.g - 1, i: 0 })} aria-label="Histórias anteriores" className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white md:flex">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {pos.g < groups.length - 1 && (
          <button type="button" onClick={() => setPos({ g: pos.g + 1, i: 0 })} aria-label="Próximas histórias" className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white md:flex">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="História">
        <div className="space-y-1 pt-1">
          {(mine || staff) && (
            <button type="button" onClick={() => (setMenu(false), openViewers())} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-white hover:bg-white/[0.05]">
              <Eye className="h-5 w-5" /> Visualizações e reações
            </button>
          )}
          {(mine || rank(role) >= 2) && (
            <button type="button" onClick={() => (setMenu(false), setConfirmDelete(true))} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-red-300 hover:bg-white/[0.05]">
              <Trash2 className="h-5 w-5" /> Excluir história
            </button>
          )}
          {!mine && rank(role) < 2 && staff && (
            <button type="button" onClick={() => (setMenu(false), router.push(`/comunidades/${community.slug}/historias`))} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left text-sm text-white hover:bg-white/[0.05]">
              Arquivo de histórias
            </button>
          )}
        </div>
      </Sheet>
      <Sheet open={showViewers} onClose={() => setShowViewers(false)} title={`Visualizações · ${story.viewCount}`}>
        {story.type === "poll" && pollRes && story.meta.poll && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-sm font-semibold text-white">{story.meta.poll.question}</p>
            {story.meta.poll.options.map((o, i) => (
              <p key={i} className="flex justify-between text-xs text-white/70">
                <span>{o}</span>
                <span className="tabular-nums">{pollRes.counts[i] ?? 0}</span>
              </p>
            ))}
          </div>
        )}
        {viewers === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : viewers.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">Ninguém viu esta história ainda.</p>
        ) : (
          <div className="space-y-0.5">
            {viewers.map((v) => (
              <a key={v.userId} href={`/perfil/${v.username}`} className="flex min-h-[52px] items-center gap-3 rounded-2xl px-2 hover:bg-white/[0.04]">
                <Avatar name={v.name} url={v.avatarUrl} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{v.name}</span>
                  <span className="block text-[11px] text-white/45">{ago(v.viewedAt)}</span>
                </span>
                {v.emoji && <span className="text-xl">{v.emoji}</span>}
              </a>
            ))}
          </div>
        )}
      </Sheet>
      <Confirm open={confirmDelete} title="Excluir esta história?" message="Ela some para todos imediatamente, junto com visualizações e reações." confirmLabel="Excluir" onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </div>
  );
}

// ── Composer ────────────────────────────────────────────────────────────────
const TYPES: { id: StoryType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "image", label: "Foto", icon: Camera },
  { id: "video", label: "Vídeo", icon: Film },
  { id: "text", label: "Texto", icon: Type },
  { id: "music", label: "Música", icon: Music2 },
  { id: "poll", label: "Enquete", icon: BarChart3 },
  { id: "link", label: "Link", icon: Link2 },
];

export function StoryComposer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { supabase, community, viewer, role, toast } = useCommunity();
  const [type, setType] = useState<StoryType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [bg, setBg] = useState(STORY_BACKGROUNDS[0].id);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [link, setLink] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [hours, setHours] = useState(24);
  const [asCommunity, setAsCommunity] = useState(isEditorOrAdmin(role));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const canAsCommunity = isEditorOrAdmin(role);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview((p) => (p && URL.revokeObjectURL(p), null));
    setText("");
    setQuestion("");
    setOptions(["", ""]);
    setLink("");
    setLinkTitle("");
    setMusicTitle("");
    setArtist("");
    setError(null);
    setAsCommunity(isEditorOrAdmin(role));
  }, [open, role]);

  const uploadKind: UploadKind | null = type === "image" ? "image" : type === "video" ? "video" : type === "music" ? "audio" : null;

  function pick(f: File | undefined) {
    if (!f || !uploadKind) return;
    const problem = checkFile(f, uploadKind);
    if (problem) return setError(problem);
    setError(null);
    setFile(f);
    setPreview((p) => (p && URL.revokeObjectURL(p), URL.createObjectURL(f)));
    if (type === "music" && !musicTitle) setMusicTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 100));
  }

  async function submit() {
    if (!viewer) return;
    setError(null);
    if (uploadKind && !file) return setError("Escolha o arquivo da história.");
    if (type === "text" && !text.trim()) return setError("Escreva o texto da história.");
    if (type === "poll" && (!question.trim() || options.filter((o) => o.trim()).length < 2)) return setError("A enquete precisa de uma pergunta e de 2 a 4 opções.");
    if (type === "link" && !/^https?:\/\/\S+\.\S+/.test(link.trim()) && !/^\S+\.\S+/.test(link.trim())) return setError("Informe um link válido.");
    setBusy(true);
    try {
      let mediaUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      if (file && uploadKind) {
        mediaUrl = (await uploadCommunityFile(supabase, viewer.id, community.id, file, uploadKind)).url;
        if (uploadKind === "video") {
          const poster = await videoPoster(file);
          if (poster) thumbnailUrl = (await uploadCommunityFile(supabase, viewer.id, community.id, poster, "image")).url;
        }
      }
      const url = link.trim() && !/^https?:\/\//i.test(link.trim()) ? `https://${link.trim()}` : link.trim();
      const { error: e } = await supabase.rpc("community_create_story", {
        p_community: community.id,
        p: {
          type,
          mediaUrl,
          thumbnailUrl,
          text: text.trim(),
          background: bg,
          hours,
          asCommunity: canAsCommunity && asCommunity,
          ...(type === "poll" ? { poll: { question: question.trim(), options: options.map((o) => o.trim()).filter(Boolean) } } : {}),
          ...(type === "link" ? { link: { url, title: linkTitle.trim() } } : {}),
          ...(type === "music" ? { music: { title: musicTitle.trim(), artist: artist.trim() } } : {}),
        } as never,
      });
      if (e) throw new Error(communityError(e.message));
      toast("História publicada!");
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar agora.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";
  const showBg = type === "text" || type === "poll" || type === "link" || type === "music";

  return (
    <Sheet
      open={open}
      onClose={() => !busy && onClose()}
      wide
      title="Nova história"
      footer={
        <div className="flex items-center gap-2">
          {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <p className="min-w-0 flex-1 truncate text-xs text-white/45">Some automaticamente em {hours} horas</p>}
          <button type="button" onClick={submit} disabled={busy} className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publicar
          </button>
        </div>
      }
    >
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => (setType(t.id), setFile(null), setPreview(null), setError(null))}
              aria-pressed={type === t.id}
              className={clsx("flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition", type === t.id ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/70 hover:text-white")}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        {/* Live preview in 9:16 */}
        <div className="mx-auto w-40 md:w-full">
          <div className="relative aspect-[9/16] overflow-hidden rounded-3xl border border-white/10 bg-black" style={showBg ? { background: backgroundOf(bg) } : undefined}>
            {preview && type === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            )}
            {preview && type === "video" && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={preview} muted autoPlay loop playsInline className="h-full w-full object-cover" />
            )}
            {showBg && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
                {type === "music" && <Music2 className="h-8 w-8 text-white/85" />}
                {type === "music" && <p className="text-xs font-bold text-white">{musicTitle || "Música"}</p>}
                {text && <p className="line-clamp-6 break-words text-sm font-bold text-white">{text}</p>}
                {type === "poll" && question && <p className="rounded-xl bg-black/25 px-2 py-1 text-[11px] font-semibold text-white">{question}</p>}
                {type === "link" && link && <p className="max-w-full truncate rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-black">{linkTitle || link}</p>}
              </div>
            )}
            {!preview && uploadKind && uploadKind !== "audio" && (
              <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-white/60">
                {type === "image" ? <Camera className="h-7 w-7" /> : <Film className="h-7 w-7" />}
                Escolher {type === "image" ? "foto" : "vídeo"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {uploadKind && (
            <>
              <input ref={input} type="file" hidden accept={ACCEPT[uploadKind]} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
              <button type="button" onClick={() => input.current?.click()} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-sm font-medium text-white/75 hover:border-orbit-purple/50">
                {file ? `Trocar arquivo · ${file.name}` : type === "music" ? "Escolher áudio (MP3, M4A, OGG)" : type === "video" ? "Escolher vídeo (até 50 MB)" : "Escolher foto"}
              </button>
            </>
          )}
          {type === "music" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} maxLength={100} placeholder="Nome da música" className={field} />
              <input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={100} placeholder="Artista (opcional)" className={field} />
            </div>
          )}
          {type === "poll" && (
            <div className="space-y-2">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={120} placeholder="Pergunta" className={field} />
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input value={o} onChange={(e) => setOptions((l) => l.map((x, k) => (k === i ? e.target.value : x)))} maxLength={40} placeholder={`Opção ${i + 1}`} className={field} />
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions((l) => l.filter((_, k) => k !== i))} aria-label="Remover opção" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-white/60">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <button type="button" onClick={() => setOptions((l) => [...l, ""])} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-orbit-cyan hover:bg-orbit-cyan/10">
                  <Plus className="h-4 w-4" /> Adicionar opção
                </button>
              )}
            </div>
          )}
          {type === "link" && (
            <div className="grid gap-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={2000} inputMode="url" placeholder="https://" className={field} />
              <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} maxLength={100} placeholder="Título do link (opcional)" className={field} />
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={type === "text" ? 4 : 2}
            placeholder={type === "text" ? "O que está acontecendo?" : "Legenda (opcional)"}
            className={clsx(field, "resize-none")}
          />
          {showBg && (
            <div>
              <p className="mb-1.5 text-xs text-white/50">Fundo</p>
              <div className="flex flex-wrap gap-2">
                {STORY_BACKGROUNDS.map((b) => (
                  <button key={b.id} type="button" onClick={() => setBg(b.id)} aria-label={`Fundo ${b.id}`} aria-pressed={bg === b.id} className={clsx("h-10 w-10 rounded-full border-2 transition", bg === b.id ? "border-white scale-110" : "border-transparent")} style={{ background: b.css }} />
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Duração</span>
              <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={field}>
                <option value={6}>6 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
                <option value={48}>48 horas</option>
              </select>
            </label>
            {canAsCommunity && (
              <button type="button" onClick={() => setAsCommunity((v) => !v)} aria-pressed={asCommunity} className="flex min-h-[48px] items-center gap-3 self-end rounded-2xl border border-white/10 px-3 text-left">
                <span className={clsx("relative h-6 w-11 shrink-0 rounded-full transition", asCommunity ? "bg-orbit-gradient" : "bg-white/15")}>
                  <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", asCommunity ? "left-[22px]" : "left-0.5")} />
                </span>
                <span className="text-xs text-white/80">Publicar como {community.name}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
