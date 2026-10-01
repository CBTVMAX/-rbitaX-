"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyUpload } from "@/lib/upload-guard";
import { deletePersonalStory, groupPersonalStories, loadPersonalStories, markStorySeen, type PersonalStory } from "@/lib/personal-stories";
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
 * Full-screen viewer for profile stories. Deliberately simpler than the community StoryViewer:
 * no reactions, polls or replies — just the picture, the author, progress and the ability to
 * delete your own.
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
  const video = useRef<HTMLVideoElement>(null);

  const group = groups[pos.g];
  const story = group?.stories[pos.i];
  const mine = !!story && story.userId === viewerId;

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
    if (!mine) markStorySeen(story.id).then(() => {});
    onSeen?.(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [story?.id]);
  useEffect(() => {
    if (!story || story.type === "video" || paused || busy) return;
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
  }, [story?.id, paused, busy, next]);

  async function onDelete() {
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

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black" role="dialog" aria-label={`História de ${story.user.name}`}>
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative h-full w-full max-w-[520px] overflow-hidden bg-space-bg"
        style={story.mediaUrl ? undefined : { aspectRatio: String(ratio) }}
        onClick={() => setPaused((v) => !v)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {story.type === "video" && story.mediaUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={video}
              src={story.mediaUrl}
              autoPlay
              muted={paused}
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
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#1e1b4b,#6d28d9_45%,#db2777)] px-8 text-center text-2xl font-bold text-white">
              {story.text}
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 top-0 z-10 flex gap-1.5 p-3">
          {group?.stories.map((s, idx) => (
            <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                className="block h-full bg-white transition-[width] duration-100"
                style={{ width: idx < pos.i ? "100%" : idx === pos.i ? `${progress * 100}%` : "0%" }}
              />
            </span>
          ))}
        </div>

        <div className="absolute inset-x-0 top-7 z-10 flex items-center gap-2.5 px-3">
          {story.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-space-card text-xs text-white/60">
              {story.user.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-sm font-semibold text-white drop-shadow">{story.user.name}</span>
          {mine && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="ml-auto rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/90 hover:bg-black/60 disabled:opacity-60"
            >
              {busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Excluir"}
            </button>
          )}
        </div>

        {/* Tapping the edges navigates, matching the community viewer. */}
        <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute inset-y-0 left-0 z-10 w-1/4" />
        <button type="button" aria-label="Próxima" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute inset-y-0 right-0 z-10 w-1/4" />

        {paused && <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90">Pausado</span>}
        {error && <p className="absolute inset-x-4 bottom-6 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">{error}</p>}
      </div>
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

  async function create(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const mime = await verifyUpload(file, ["image", "video"], file.name);
      const type = mime.startsWith("video") ? "video" : "image";
      const supabase = createClient();
      const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
      const path = `${viewerId}/moments/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: mime });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const { error: rpcErr } = await supabase.rpc("story_create", { p: { type, mediaUrl: pub.publicUrl, hours: 24 } });
      if (rpcErr) throw rpcErr;
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
