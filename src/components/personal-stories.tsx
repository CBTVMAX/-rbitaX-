"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BookmarkPlus, Check, Download, Eye, Loader2, MoreVertical, Plus, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyUpload } from "@/lib/upload-guard";
import {
  deletePersonalStory,
  groupPersonalStories,
  loadMyArchivedStories,
  loadMyStoryReaction,
  loadPersonalStories,
  loadStoryViewers,
  markStorySeen,
  reactToStory,
  replyToStory,
  saveStoryToProfile,
  STORY_REACTIONS,
  type PersonalStory,
  type StoryViewer,
} from "@/lib/personal-stories";
import { ago } from "@/lib/communities";
import { Sheet } from "@/components/community/ui";
import { avatarAspect } from "@/lib/avatar-aspect";
import { clsx } from "clsx";

const IMAGE_MS = 6000;
const GAP_MS = 400;

export type PersonalGroup = {
  key: string;
  name: string;
  avatarUrl: string | null;
  stories: PersonalStory[];
  seen: boolean;
};

/**
 * Full-screen viewer for profile stories. Friends react with an emoji or answer in the Messenger;
 * the author sees who watched (and each reaction), saves it to the profile or deletes it.
 */
export function PersonalStoryViewer({
  groups,
  start,
  viewerId,
  onClose,
  onSeen,
  onDeleted,
}: {
  groups: PersonalGroup[];
  start: { g: number; i: number };
  viewerId: string;
  onClose: () => void;
  onSeen?: (id: string) => void;
  onDeleted?: (id: string) => void;
}) {
  const [pos, setPos] = useState(start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[] | null>(null);
  const [myReaction, setMyReaction] = useState<Record<string, string | null>>({});
  const [reply, setReply] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  const group = groups[pos.g];
  const story = group?.stories[pos.i];
  const mine = !!story && story.userId === viewerId;
  // Anything on top of the story (menu, list, keyboard) holds the timer, like VK and Instagram.
  const hold = paused || busy || menu || viewersOpen || typing || reply.length > 0;

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

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
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

  useEffect(() => {
    setProgress(0);
    if (!story) return;
    setError(null);
    if (!mine) {
      markStorySeen(story.id).then(() => {});
      if (!(story.id in myReaction)) loadMyStoryReaction(story.id, viewerId).then((e) => setMyReaction((r) => ({ ...r, [story.id]: e })));
    }
    onSeen?.(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [story?.id]);
  useEffect(() => {
    if (!story || story.type === "video" || hold) return;
    let last = performance.now();
    let raf = 0;
    const duration = story.type === "text" ? IMAGE_MS + 2000 : IMAGE_MS;
    const tick = (t: number) => {
      elapsed.current += t - last;
      last = t;
      if (elapsed.current >= duration) {
        // Small hold so the next story's first frame is not cut off by the wipe.
        window.setTimeout(next, GAP_MS);
        return;
      }
      setProgress(Math.min(1, elapsed.current / duration));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story?.id, hold, next]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (hold) el.pause();
    else el.play().catch(() => {});
  }, [hold, story?.id]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(t);
  }, [notice]);

  async function openViewers() {
    if (!story) return;
    setMenu(false);
    setViewers(null);
    setViewersOpen(true);
    try {
      setViewers(await loadStoryViewers(story.id));
    } catch {
      setViewers([]);
      setError("Não foi possível carregar as visualizações.");
    }
  }

  async function react(emoji: string) {
    if (!story) return;
    const prevEmoji = myReaction[story.id] ?? null;
    const nextEmoji = prevEmoji === emoji ? null : emoji;
    setMyReaction((r) => ({ ...r, [story.id]: nextEmoji }));
    try {
      await reactToStory(story.id, nextEmoji);
      if (nextEmoji) setNotice(`Você reagiu ${nextEmoji}`);
    } catch {
      setMyReaction((r) => ({ ...r, [story.id]: prevEmoji }));
      setError("Não foi possível reagir agora.");
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !story || sending) return;
    setSending(true);
    try {
      await replyToStory(story, viewerId, text);
      setReply("");
      setNotice("Resposta enviada no Messenger.");
      (document.activeElement as HTMLElement | null)?.blur();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a resposta.");
    }
    setSending(false);
  }

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  async function onSave() {
    setMenu(false);
    if (!story || savedIds.has(story.id)) return;
    setBusy(true);
    setError(null);
    try {
      await saveStoryToProfile(story, viewerId);
      setSavedIds((prev) => new Set(prev).add(story.id));
      setNotice(story.type === "video" ? "Salvo na aba Vídeos do perfil." : "Salvo nas Fotos do perfil.");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível salvar no perfil.");
    }
    setBusy(false);
  }

  async function onDelete() {
    setMenu(false);
    if (!story) return;
    setBusy(true);
    try {
      await deletePersonalStory(story.id);
      onDeleted?.(story.id);
      // Step back inside the group, or close when this was its only story.
      if (group && group.stories.length > 1) setPos({ g: pos.g, i: Math.max(0, pos.i - 1) });
      else if (pos.g + 1 < groups.length) setPos({ g: pos.g + 1, i: 0 });
      else onClose();
    } catch {
      setError("Não foi possível excluir a história.");
    }
    setBusy(false);
  }

  if (!story) return null;

  // A story published from the avatar keeps its own ratio, so it is never re-cropped here.
  const ratio = story.mediaUrl ? avatarAspect(story.mediaUrl) : 9 / 16;

  const reactionCount = viewers?.filter((v) => v.emoji).length ?? 0;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const menuItem = "flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-sm text-white hover:bg-white/[0.06] disabled:opacity-50";

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black" role="dialog" aria-label={`História de ${story.user.name}`}>
      <div
        className="relative h-full w-full max-w-[520px] overflow-hidden bg-space-bg md:h-[92vh] md:rounded-3xl"
        style={story.mediaUrl ? undefined : { aspectRatio: String(ratio) }}
        onClick={() => (menu ? setMenu(false) : setPaused((v) => !v))}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {story.type === "video" && story.mediaUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={video}
              src={story.mediaUrl}
              autoPlay
              playsInline
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration) setProgress(el.currentTime / el.duration);
              }}
              onEnded={next}
              className="h-full w-full object-contain"
            />
          ) : story.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.mediaUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#1e1b4b,#6d28d9_45%,#db2777)] px-8 text-center text-2xl font-bold text-snow">
              {story.text}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1.5 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {group?.stories.map((s, idx) => (
            <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                className="block h-full bg-snow transition-[width] duration-100"
                style={{ width: idx < pos.i ? "100%" : idx === pos.i ? `${progress * 100}%` : "0%" }}
              />
            </span>
          ))}
        </div>

        <div className="absolute inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+14px)] z-20 flex items-center gap-2.5 pl-3 pr-1.5" onClick={stop}>
          <Link href={`/perfil/${story.user.username}`} onClick={onClose} className="flex min-w-0 items-center gap-2.5">
            {story.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.user.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/20" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-space-card text-xs text-white/60">
                {story.user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm font-semibold text-snow drop-shadow">{story.user.name}</span>
          </Link>
          <span className="shrink-0 text-xs text-snow/70 drop-shadow">{ago(story.createdAt)}</span>
          <span className="ml-auto flex shrink-0 items-center">
            {mine && (
              <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Opções da história" aria-expanded={menu} className="flex h-10 w-10 items-center justify-center rounded-full text-snow hover:bg-white/10">
                <MoreVertical className="h-5 w-5" />
              </button>
            )}
            <button type="button" aria-label="Fechar" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-snow hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
          </span>
        </div>

        {menu && (
          <div role="menu" onClick={stop} className="absolute right-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+62px)] z-30 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#1f2128]/95 py-1.5 shadow-2xl backdrop-blur">
            <button type="button" role="menuitem" onClick={openViewers} className={menuItem}>
              <Eye className="h-5 w-5 text-orbit-blue" /> Visualizações e reações
            </button>
            {story.mediaUrl && (
              <button type="button" role="menuitem" onClick={onSave} disabled={busy || savedIds.has(story.id)} className={menuItem}>
                {savedIds.has(story.id) ? <Check className="h-5 w-5 text-emerald-400" /> : <BookmarkPlus className="h-5 w-5 text-orbit-blue" />}
                {savedIds.has(story.id) ? "Salvo no perfil" : "Salvar no perfil"}
              </button>
            )}
            {story.mediaUrl && (
              <a role="menuitem" href={story.mediaUrl} download target="_blank" rel="noreferrer" onClick={() => setMenu(false)} className={menuItem}>
                <Download className="h-5 w-5 text-orbit-blue" /> Baixar no aparelho
              </a>
            )}
            <button type="button" role="menuitem" onClick={onDelete} disabled={busy} className={clsx(menuItem, "text-red-300")}>
              <Trash2 className="h-5 w-5 text-red-400" /> Excluir história
            </button>
          </div>
        )}

        {/* Tapping the edges navigates, matching the community viewer. */}
        <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute inset-y-24 left-0 z-10 w-1/4" />
        <button type="button" aria-label="Próxima" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute inset-y-24 right-0 z-10 w-1/4" />

        {paused && <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-snow/90">Pausado</span>}

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-12" onClick={stop}>
          {(error || notice) && (
            <p
              role="status"
              className={clsx(
                "mx-auto mb-3 w-fit max-w-full rounded-full px-4 py-1.5 text-center text-xs font-medium",
                error ? "bg-red-500/90 text-snow" : "bg-white/90 text-[#111]"
              )}
            >
              {error ?? notice}
            </p>
          )}
          {mine ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={openViewers} className="flex min-h-[44px] items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium text-snow backdrop-blur hover:bg-white/25">
                <Eye className="h-4 w-4" />
                {story.viewCount === 0 ? "Não há visualizações" : `${story.viewCount} ${story.viewCount === 1 ? "visualização" : "visualizações"}`}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2.5 flex justify-center gap-1.5">
                {STORY_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => react(e)}
                    aria-label={`Reagir ${e}`}
                    aria-pressed={myReaction[story.id] === e}
                    className={clsx(
                      "flex h-11 w-11 items-center justify-center rounded-full text-2xl transition active:scale-90",
                      myReaction[story.id] === e ? "scale-110 bg-white/25 ring-2 ring-white/70" : "bg-white/10 hover:bg-white/20"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setTyping(true)}
                  onBlur={() => setTyping(false)}
                  maxLength={1000}
                  placeholder={`Responder a ${story.user.name.split(" ")[0]}…`}
                  className="min-h-[46px] min-w-0 flex-1 rounded-full border border-white/40 bg-black/30 px-4 text-sm text-snow outline-none backdrop-blur placeholder:text-snow/65 focus:border-white"
                />
                <button type="submit" disabled={!reply.trim() || sending} aria-label="Enviar resposta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-snow text-[#111] disabled:opacity-40">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <Sheet
        open={viewersOpen}
        onClose={() => setViewersOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> {story.viewCount} {story.viewCount === 1 ? "visualização" : "visualizações"}
            {reactionCount > 0 && <span className="text-sm font-normal text-white/50">· {reactionCount} {reactionCount === 1 ? "reação" : "reações"}</span>}
          </span>
        }
      >
        {viewers === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : viewers.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">Ninguém viu esta história ainda.</p>
        ) : (
          <div className="space-y-0.5">
            {viewers.map((v) => (
              <Link key={v.userId} href={`/perfil/${v.username}`} onClick={onClose} className="flex min-h-[48px] items-center gap-3 rounded-2xl px-2 hover:bg-white/[0.04]">
                <span className="relative shrink-0">
                  {v.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-space-card text-sm text-white/60">{v.name.charAt(0).toUpperCase()}</span>
                  )}
                  {v.emoji && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-space-surface text-sm">{v.emoji}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{v.name}</span>
                  <span className="block text-[11px] text-white/45">{v.emoji ? `Reagiu ${v.emoji} · ` : "Viu · "}{ago(v.viewedAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Sheet>
    </div>,
    document.body
  );
}

/** Strip + viewer, self-contained: opens the viewer itself so callers only drop it in. */
export function PersonalStories({ viewerId, highlight }: { viewerId: string; highlight?: string }) {
  const [groups, setGroups] = useState<PersonalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState<{ g: number; i: number } | null>(null);
  // Tracked locally so the ring fills in as soon as a story is watched, without a round trip.
  const [seen, setSeen] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    return loadPersonalStories()
      .then((stories) => setGroups(groupPersonalStories(stories, new Set())))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  // On someone's profile only their own stories belong there, with the profile person first.
  const shown = useMemo(() => {
    if (!highlight) return groups;
    const g = groups.find((x) => x.key === highlight);
    return g ? [g] : [];
  }, [groups, highlight]);

  if (loading || shown.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3">
        {shown.map((g, gi) => {
          const allSeen = g.stories.every((s) => seen.has(s.id));
          return (
          <button
            key={g.key}
            type="button"
            onClick={() => setStart({ g: gi, i: 0 })}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={clsx(
                "flex h-14 w-14 items-center justify-center rounded-full p-[2.5px]",
                allSeen ? "bg-white/15" : "bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)]"
              )}
            >
              {g.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.avatarUrl} alt={g.name} className="h-full w-full rounded-full border-2 border-space-bg object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-space-bg bg-space-card text-sm text-white/60">
                  {g.name.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="max-w-[64px] truncate text-[11px] text-white/70">{g.name.split(" ")[0]}</span>
          </button>
          );
        })}
      </div>

      {start && (
        <PersonalStoryViewer
          groups={shown}
          start={start}
          viewerId={viewerId}
          onClose={() => setStart(null)}
          onSeen={(id) => setSeen((prev) => new Set(prev).add(id))}
          onDeleted={reload}
        />
      )}
    </>
  );
}

/**
 * "Momentos" do perfil: faixa discreta de círculos pequenos com os momentos ativos da pessoa.
 * O dono vê o "+" para criar um novo (foto ou vídeo, 24h); tocar abre o visualizador, onde o
 * dono também pode excluir. Quem pode ver é decidido pelo banco (privacidade do perfil).
 */
export function ProfileMoments({
  viewerId,
  userId,
  isMe,
  variant = "strip",
  frameClassName,
}: {
  viewerId: string;
  userId: string;
  isMe: boolean;
  /** "strip": faixa de círculos no cabeçalho; "grid": quadros maiores na aba Momentos. */
  variant?: "strip" | "grid";
  /** Moldura da faixa (só é desenhada quando a faixa aparece). */
  frameClassName?: string;
}) {
  const [stories, setStories] = useState<PersonalStory[] | null>(null);
  const [archive, setArchive] = useState<PersonalStory[]>([]);
  const [archiveStart, setArchiveStart] = useState<number | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    return loadPersonalStories()
      .then((all) => setStories(all.filter((s) => s.userId === userId)))
      .catch(() => setStories([]));
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (variant === "grid" && isMe) loadMyArchivedStories(userId).then(setArchive).catch(() => {});
  }, [variant, isMe, userId]);

  async function create(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await createMomentFromFile(viewerId, file);
      await reload();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível publicar o momento.");
    }
    setBusy(false);
  }

  if (stories === null) return null;
  if (!isMe && stories.length === 0 && variant === "strip") return null;

  const group: PersonalGroup | null = stories.length
    ? { key: userId, name: stories[0].user.name, avatarUrl: stories[0].user.avatarUrl, stories, seen: false }
    : null;

  const viewer =
    group && start !== null ? (
      <PersonalStoryViewer
        groups={[group]}
        start={{ g: 0, i: start }}
        viewerId={viewerId}
        onClose={() => setStart(null)}
        onDeleted={() => {
          setStart(null);
          reload();
        }}
      />
    ) : null;
  const errorToast = error && (
    <button type="button" role="alert" onClick={() => setError(null)} className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-500/95 px-4 py-2.5 text-sm font-medium text-snow shadow-2xl md:bottom-6">
      {error}
    </button>
  );
  const fileInput = <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={create} />;

  if (variant === "grid") {
    const archiveGroup: PersonalGroup | null = archive.length
      ? { key: `${userId}-arquivo`, name: archive[0].user.name, avatarUrl: archive[0].user.avatarUrl, stories: archive, seen: true }
      : null;
    return (
      <>
        {stories.length === 0 && !isMe ? (
          <p className="py-8 text-center text-sm text-white/50">Nenhum momento ativo agora.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {isMe && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex aspect-[9/14] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-white/60 transition hover:border-pa/60 hover:text-white disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pa/15 text-pa">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                </span>
                <span className="text-xs font-medium">Novo momento</span>
                <span className="text-[10px] text-white/40">fica 24h</span>
              </button>
            )}
            {stories.map((s, i) => (
              <button key={s.id} type="button" onClick={() => setStart(i)} aria-label={`Ver momento ${i + 1}`} className="relative aspect-[9/14] overflow-hidden rounded-xl bg-space-card ring-2 ring-pa/40 transition hover:ring-pa">
                {s.type === "image" && s.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.mediaUrl} alt="" className="h-full w-full object-cover" />
                ) : s.type === "video" && s.mediaUrl ? (
                  <video src={s.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center p-2 text-xs text-white/70">{s.text ?? "Momento"}</span>
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-snow">
                  {new Date(s.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            ))}
          </div>
        )}
        {isMe && archive.length > 0 && (
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-white">
              Arquivo de histórias <span className="font-normal text-white/45">· só você vê</span>
            </h3>
            <p className="mt-0.5 text-xs text-white/45">Histórias que já saíram do ar. Abra uma e toque em “Salvar no perfil” para mantê-la como publicação.</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5 md:grid-cols-6">
              {archive.map((s, i) => (
                <button key={s.id} type="button" onClick={() => setArchiveStart(i)} aria-label={`Ver história arquivada ${i + 1}`} className="relative aspect-[9/14] overflow-hidden rounded-lg bg-space-card opacity-90 transition hover:opacity-100">
                  {s.type === "video" ? (
                    <video src={s.mediaUrl ?? undefined} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.mediaUrl ?? ""} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[9px] text-snow">
                    {new Date(s.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        {archiveGroup && archiveStart !== null && (
          <PersonalStoryViewer groups={[archiveGroup]} start={{ g: 0, i: archiveStart }} viewerId={viewerId} onClose={() => setArchiveStart(null)} onDeleted={() => { setArchiveStart(null); loadMyArchivedStories(userId).then(setArchive).catch(() => {}); }} />
        )}
        {isMe && (
          <p className="mt-3 text-[11px] text-white/40">
            Quem vê seus momentos segue a privacidade do perfil.{" "}
            <Link href="/configuracoes/conta" className="text-pa hover:underline">
              Privacidade
            </Link>
          </p>
        )}
        {fileInput}
        {errorToast}
        {viewer}
      </>
    );
  }

  return (
    <div className={clsx("flex items-center gap-3", frameClassName ?? "px-4 pb-3 md:px-6")}>
      <span className="shrink-0 text-xs font-medium text-white/50">Momentos</span>
      <div className="orbit-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto py-0.5">
        {isMe && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Criar momento"
            title="Criar momento (24h)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-white/60 transition hover:border-orbit-purple/60 hover:text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
        {stories.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStart(i)}
            aria-label={`Ver momento ${i + 1}`}
            className="h-10 w-10 shrink-0 rounded-full bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)] p-[2px]"
          >
            <span className="block h-full w-full overflow-hidden rounded-full border-2 border-space-surface bg-space-card">
              {s.type === "image" && s.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.mediaUrl} alt="" className="h-full w-full object-cover" />
              ) : s.type === "video" && s.mediaUrl ? (
                <video src={s.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-white/60">Aa</span>
              )}
            </span>
          </button>
        ))}
        {isMe && stories.length === 0 && <span className="text-xs text-white/40">Compartilhe um momento de 24h</span>}
      </div>
      {isMe && (
        <Link href="/configuracoes/conta" className="ml-auto hidden shrink-0 text-[11px] text-white/40 hover:text-white/70 sm:block" title="Quem vê seus momentos segue a privacidade do perfil">
          Privacidade
        </Link>
      )}
      {fileInput}
      {errorToast}
      {viewer}
    </div>
  );
}

/** Publica uma foto ou vídeo como momento/história de 24h (mesmo fluxo do perfil e do feed). */
export async function createMomentFromFile(userId: string, file: File) {
  const mime = await verifyUpload(file, ["image", "video"], file.name);
  const type = mime.startsWith("video") ? "video" : "image";
  const supabase = createClient();
  const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
  const path = `${userId}/moments/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: mime });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
  const { error: rpcErr } = await supabase.rpc("story_create", { p: { type, mediaUrl: pub.publicUrl, hours: 24 } });
  if (rpcErr) throw rpcErr;
}

/**
 * Histórias no topo do feed. Computador: cartões (com "Criar história" primeiro).
 * Celular: círculos grandes com o nome embaixo. A sua aparece primeiro como "Seu story".
 */
export function FeedStories({ me }: { me: { id: string; name: string; avatarUrl: string | null } }) {
  const [groups, setGroups] = useState<PersonalGroup[] | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [start, setStart] = useState<{ g: number; i: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(
    () =>
      loadPersonalStories()
        .then((stories) => {
          const all = groupPersonalStories(stories, new Set());
          const mine = all.filter((g) => g.key === me.id);
          setGroups([...mine, ...all.filter((g) => g.key !== me.id)]);
        })
        .catch(() => setGroups([])),
    [me.id]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await createMomentFromFile(me.id, file);
      await reload();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível publicar a história.");
    }
    setBusy(false);
  }

  const list = groups ?? [];
  const mine = list.find((g) => g.key === me.id);
  const others = list.filter((g) => g.key !== me.id);
  const isSeen = (g: PersonalGroup) => g.stories.every((s) => seen.has(s.id));
  const indexOf = (g: PersonalGroup) => list.indexOf(g);
  const cover = (g: PersonalGroup) => {
    const last = g.stories[g.stories.length - 1];
    return last?.type === "image" && last.mediaUrl ? last.mediaUrl : g.avatarUrl;
  };
  const ring = (g: PersonalGroup) =>
    isSeen(g) ? "bg-white/20" : "bg-[conic-gradient(from_210deg,rgb(var(--app-accent-a,43_108_255)),rgb(var(--app-accent,139_92_246)),rgb(var(--app-accent-b,236_72_153)),#22d3ee,rgb(var(--app-accent-a,43_108_255)))]";
  const avatarInner = (url: string | null, name: string) =>
    url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-full w-full object-cover" />
    ) : (
      <span className="flex h-full w-full items-center justify-center bg-space-card text-lg font-semibold text-white/60">{name.charAt(0).toUpperCase()}</span>
    );
  const openMine = () => (mine ? setStart({ g: indexOf(mine), i: 0 }) : inputRef.current?.click());

  return (
    <>
      {/* ---------- Celular: círculos grandes ---------- */}
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 py-3 md:hidden">
        <div className="flex w-[84px] shrink-0 flex-col items-center gap-1.5">
          <button type="button" onClick={openMine} className="relative h-[84px] w-[84px]" aria-label={mine ? "Ver seu story" : "Criar história"}>
            <span className={clsx("block h-full w-full rounded-full p-[3px]", mine ? ring(mine) : "bg-transparent")}>
              <span className="block h-full w-full overflow-hidden rounded-full border-[3px] border-space-bg">{avatarInner(me.avatarUrl, me.name)}</span>
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Criar história"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-space-bg bg-orbit-blue text-snow"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={3} />}
            </span>
          </button>
          <span className="max-w-full truncate text-[13px] text-white/85">{mine ? "Seu story" : "História"}</span>
        </div>
        {others.map((g) => (
          <button key={g.key} type="button" onClick={() => setStart({ g: indexOf(g), i: 0 })} className="flex w-[84px] shrink-0 flex-col items-center gap-1.5">
            <span className={clsx("block h-[84px] w-[84px] rounded-full p-[3px]", ring(g))}>
              <span className="block h-full w-full overflow-hidden rounded-full border-[3px] border-space-bg">{avatarInner(g.avatarUrl, g.name)}</span>
            </span>
            <span className="max-w-full truncate text-[13px] text-white/85">{g.name.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* ---------- Computador: cartões ---------- */}
      <div className="ox-card hidden rounded-2xl border border-white/10 bg-space-surface p-2.5 md:block">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-[124px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-white/60 transition hover:border-pa/50 hover:text-white disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            </span>
            <span className="text-[11px]">Criar história</span>
          </button>
          {[...(mine ? [mine] : []), ...others].map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setStart({ g: indexOf(g), i: 0 })}
              className="group relative flex h-[124px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent transition hover:border-pa/50"
            >
              <span className={clsx("block h-[60px] w-[60px] rounded-full p-[2.5px]", ring(g))}>
                <span className="block h-full w-full overflow-hidden rounded-full border-2 border-space-surface">{avatarInner(cover(g), g.name)}</span>
              </span>
              <span className="max-w-[84px] truncate px-1 text-[11px] text-white/85">{g.key === me.id ? "Seu story" : g.name.split(" ")[0]}</span>
            </button>
          ))}
          {groups !== null && list.length === 0 && (
            <p className="flex items-center px-3 text-xs text-white/45">Nenhuma história agora. Que tal criar a primeira?</p>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={create} />
      {error && (
        <button type="button" role="alert" onClick={() => setError(null)} className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-500/95 px-4 py-2.5 text-sm font-medium text-snow shadow-2xl md:bottom-6">
          {error}
        </button>
      )}
      {start && (
        <PersonalStoryViewer
          groups={list}
          start={start}
          viewerId={me.id}
          onClose={() => setStart(null)}
          onSeen={(id) => setSeen((prev) => new Set(prev).add(id))}
          onDeleted={reload}
        />
      )}
    </>
  );
}
