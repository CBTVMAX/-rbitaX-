"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Bookmark,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Flag,
  Heart,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquareOff,
  MoreHorizontal,
  Music2,
  Pencil,
  Pin,
  Repeat2,
  Reply,
  PinOff,
  RotateCcw,
  Send,
  Share2,
  ShieldX,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { ago as timeAgo } from "@/lib/communities";
import { can, communityError, compactNumber, isEditorOrAdmin, rank, reactionOf, REACTIONS, TAG_LABEL, type CommunityPost, type ReactionKey } from "@/lib/communities";
import { useCommunity } from "./context";
import { Confirm, Sheet } from "./ui";
import { RichText } from "./rich-text";
import { Lightbox } from "./lightbox";
import { ReportSheet, type ReportTarget } from "./report-sheet";

type CommentRow = { id: string; content: string; createdAt: string; status: string; userId: string; parentId: string | null; user: { name: string; username: string; avatarUrl: string | null } };
const COMMENT_COLUMNS = "id, content, createdAt, status, userId, parentId, user:User!Comment_userId_fkey(name, username, avatarUrl)";
type Reactor = { reaction: ReactionKey; user: { id: string; name: string; username: string; avatarUrl: string | null } };

/** Tap = ❤️ (or remove); press and hold / hover = pick one of the 7 reactions. */
function ReactionButton({ mine, count, top, onPick, onShowList }: { mine: ReactionKey | null; count: number; top: ReactionKey[]; onPick: (r: ReactionKey | null) => void; onShowList: () => void }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const clear = () => timer.current && clearTimeout(timer.current);
  const current = mine ? reactionOf(mine) : null;
  return (
    <span className="relative flex items-center" onMouseLeave={() => (clear(), setOpen(false))}>
      {open && (
        <span role="menu" className="animate-pop-in absolute bottom-full left-0 z-20 mb-2 flex gap-0.5 rounded-full border border-white/10 bg-space-surface/95 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {REACTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              role="menuitem"
              aria-label={r.label}
              title={r.label}
              onClick={() => (setOpen(false), onPick(mine === r.key ? null : r.key))}
              className={clsx("flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:-translate-y-1 hover:scale-125", mine === r.key && "bg-white/15")}
            >
              {r.emoji}
            </button>
          ))}
        </span>
      )}
      <button
        type="button"
        aria-pressed={!!mine}
        aria-label={mine ? `Sua reação: ${current?.label}. Toque para remover` : "Curtir (segure para mais reações)"}
        onMouseEnter={() => {
          clear();
          timer.current = setTimeout(() => setOpen(true), 450);
        }}
        onTouchStart={() => {
          long.current = false;
          clear();
          timer.current = setTimeout(() => ((long.current = true), setOpen(true)), 420);
        }}
        onTouchEnd={(e) => {
          clear();
          if (long.current) e.preventDefault();
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (long.current) return (long.current = false);
          setOpen(false);
          onPick(mine ? null : "like");
        }}
        className={clsx("flex min-h-[40px] select-none items-center gap-1.5 rounded-full px-3 transition hover:bg-white/5", mine && (mine === "like" ? "text-orbit-pink" : "text-white"))}
      >
        {current && mine !== "like" ? <span className="text-[18px] leading-none">{current.emoji}</span> : <Heart className={clsx("h-[18px] w-[18px]", mine && "fill-orbit-pink")} />}
      </button>
      <button type="button" onClick={onShowList} disabled={!count} className="-ml-1.5 flex min-h-[40px] items-center gap-1 rounded-full pr-2 disabled:cursor-default">
        {count > 0 && top.length > 0 && (
          <span className="flex -space-x-1 text-[13px] leading-none">
            {top.map((t) => (
              <span key={t}>{reactionOf(t).emoji}</span>
            ))}
          </span>
        )}
        {compactNumber(count)}
      </button>
    </span>
  );
}

function MediaGrid({ post, onOpen }: { post: CommunityPost; onOpen: (i: number) => void }) {
  const images = post.media.filter((m) => m.type === "image");
  if (!images.length) return null;
  const n = images.length;
  return (
    <div className={clsx("mt-3 grid gap-1 overflow-hidden rounded-2xl", n === 1 ? "grid-cols-1" : n <= 4 ? "grid-cols-2" : "grid-cols-3")}>
      {images.slice(0, 6).map((m, i) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onOpen(i)}
          aria-label={`Abrir foto ${i + 1} de ${n}`}
          style={n === 1 && m.width && m.height ? { aspectRatio: `${m.width} / ${m.height}` } : undefined}
          className={clsx("relative overflow-hidden bg-white/[0.04]", n === 1 ? "max-h-[520px]" : n === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="" loading="lazy" decoding="async" className={clsx(n === 1 ? "h-full max-h-[520px] w-full object-contain" : "absolute inset-0 h-full w-full object-cover")} />
          {i === 5 && n > 6 && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-bold text-white">+{n - 6}</span>}
        </button>
      ))}
    </div>
  );
}

function Poll({ post, onVoted }: { post: CommunityPost; onVoted: (p: CommunityPost["poll"]) => void }) {
  const { supabase, viewer, toast } = useCommunity();
  const [busy, setBusy] = useState(false);
  const poll = post.meta.poll!;
  const res = post.poll ?? { counts: poll.options.map(() => 0), mine: [], voters: 0 };
  const voted = res.mine.length > 0;
  const total = res.counts.reduce((a, b) => a + b, 0);

  async function vote(i: number) {
    if (!viewer) return toast("Entre na sua conta para votar.", true);
    const next = poll.multiple ? (res.mine.includes(i) ? res.mine.filter((x) => x !== i) : [...res.mine, i]) : res.mine.includes(i) ? [] : [i];
    setBusy(true);
    const { error } = await supabase.rpc("community_vote_poll", { p_post: post.id, p_options: next });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    const counts = res.counts.map((c, k) => c - (res.mine.includes(k) ? 1 : 0) + (next.includes(k) ? 1 : 0));
    onVoted({ counts, mine: next, voters: res.voters + (voted ? 0 : 1) - (next.length ? 0 : 1) });
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <p className="text-sm font-semibold text-white">{poll.question}</p>
      <p className="mb-2.5 text-[11px] text-white/45">{poll.multiple ? "Escolha uma ou mais opções" : "Escolha uma opção"}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const pct = total ? Math.round((res.counts[i] / total) * 100) : 0;
          const mine = res.mine.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => vote(i)}
              className={clsx(
                "relative flex min-h-[44px] w-full items-center gap-2 overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition",
                mine ? "border-orbit-purple/60 text-white" : "border-white/10 text-white/85 hover:border-white/25"
              )}
            >
              {voted && <span aria-hidden className={clsx("absolute inset-y-0 left-0 transition-all", mine ? "bg-orbit-purple/25" : "bg-white/[0.06]")} style={{ width: `${pct}%` }} />}
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/30">{mine && <Check className="h-3 w-3" strokeWidth={3} />}</span>
              <span className="relative min-w-0 flex-1 break-words">{opt}</span>
              {voted && <span className="relative shrink-0 text-xs font-semibold tabular-nums">{pct}%</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/45">{res.voters === 1 ? "1 voto" : `${res.voters} votos`}</p>
    </div>
  );
}

export function CommunityPostCard({
  post: initial,
  onChanged,
  onDeleted,
  highlight = false,
}: {
  post: CommunityPost;
  onChanged?: (p: CommunityPost) => void;
  onDeleted?: (id: string) => void;
  highlight?: boolean;
}) {
  const { supabase, viewer, role, community, toast } = useCommunity();
  const [post, setPost] = useState(initial);
  const [reaction, setReaction] = useState<ReactionKey | null>(initial.myReaction ?? (initial.likedByMe ? "like" : null));
  const [likes, setLikes] = useState(initial.likeCount);
  const [top, setTop] = useState<ReactionKey[]>(initial.topReactions ?? []);
  const [reactors, setReactors] = useState<Reactor[] | null>(null);
  const [showReactors, setShowReactors] = useState(false);
  const [reactorTab, setReactorTab] = useState<ReactionKey | "all">("all");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [repostText, setRepostText] = useState("");
  const [reposting, setReposting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const commentInput = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [showComments, setShowComments] = useState(highlight);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => setPost(initial), [initial]);
  const update = (patch: Partial<CommunityPost>) => {
    const next = { ...post, ...patch };
    setPost(next);
    onChanged?.(next);
  };

  const mine = viewer?.id === post.author.id;
  const staff = rank(role) >= 2;
  const admin = isEditorOrAdmin(role);
  const url = typeof window !== "undefined" ? `${window.location.origin}/comunidades/${community.slug}?post=${post.id}` : "";

  // One view per person per post (counted on the server when the card is on screen).
  useEffect(() => {
    if (!viewer || post.moderationStatus !== "visible") return;
    const el = ref.current;
    if (!el) return;
    let sent = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!sent && entries.some((e) => e.isIntersecting)) {
          sent = true;
          supabase.rpc("community_view", { p_post: post.id }).then(() => {});
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [viewer, post.id, post.moderationStatus, supabase]);

  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  useEffect(() => {
    if (!viewer) return;
    supabase
      .from("Bookmark")
      .select("id")
      .eq("postId", post.id)
      .eq("userId", viewer.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [viewer, post.id, supabase]);

  async function react(next: ReactionKey | null) {
    if (!viewer) return toast("Entre na sua conta para reagir.", true);
    const prev = reaction;
    if (prev === next) return;
    setReaction(next);
    setLikes((c) => c + (next && !prev ? 1 : !next && prev ? -1 : 0));
    if (next && !top.includes(next)) setTop((t) => [...t, next].slice(-3));
    setReactors(null);
    const { error } = !next
      ? await supabase.from("Like").delete().eq("postId", post.id).eq("userId", viewer.id)
      : prev
        ? await supabase.from("Like").update({ reaction: next }).eq("postId", post.id).eq("userId", viewer.id)
        : await supabase.from("Like").insert({ id: crypto.randomUUID(), postId: post.id, userId: viewer.id, reaction: next });
    if (error) {
      setReaction(prev);
      setLikes((c) => c - (next && !prev ? 1 : !next && prev ? -1 : 0));
      toast("Não foi possível reagir agora.", true);
    }
  }

  async function openReactors() {
    setShowReactors(true);
    setReactorTab("all");
    const { data } = await supabase
      .from("Like")
      .select("reaction, user:User!Like_userId_fkey(id, name, username, avatarUrl)")
      .eq("postId", post.id)
      .order("createdAt", { ascending: false })
      .limit(300);
    setReactors(((data ?? []) as unknown as Reactor[]).filter((r) => r.user));
  }

  async function repost() {
    setReposting(true);
    const { error } = await supabase.rpc("community_repost", { p_post: post.id, p_comment: repostText.trim() });
    setReposting(false);
    if (error) return toast(communityError(error.message), true);
    setShareOpen(false);
    setRepostText("");
    update({ shareCount: post.shareCount + 1 });
    toast("Repostado no seu perfil.");
  }

  async function toggleSave() {
    if (!viewer) return toast("Entre na sua conta para salvar.", true);
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("Bookmark").insert({ id: crypto.randomUUID(), postId: post.id, userId: viewer.id })
      : await supabase.from("Bookmark").delete().eq("postId", post.id).eq("userId", viewer.id);
    if (error) setSaved(!next);
    else toast(next ? "Salvo nos seus itens salvos." : "Removido dos salvos.");
  }

  async function nativeShare() {
    setShareOpen(false);
    try {
      if (navigator.share) await navigator.share({ title: community.name, text: post.content.slice(0, 120), url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link da publicação copiado.");
      }
    } catch {
      return;
    }
    if (viewer) {
      const { error } = await supabase.from("Share").insert({ id: crypto.randomUUID(), postId: post.id, userId: viewer.id });
      if (!error) update({ shareCount: post.shareCount + 1 });
    }
  }

  async function action(a: "pin" | "unpin" | "comments_on" | "comments_off" | "approve" | "remove" | "restore") {
    setMenu(false);
    setBusy(true);
    const { error } = await supabase.rpc("community_post_action", { p_post: post.id, p_action: a });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    const msg: Record<typeof a, string> = {
      pin: "Publicação fixada no topo.",
      unpin: "Publicação desafixada.",
      comments_on: "Comentários permitidos.",
      comments_off: "Comentários desativados.",
      approve: "Publicação aprovada.",
      remove: "Publicação removida da comunidade.",
      restore: "Publicação restaurada.",
    };
    toast(msg[a]);
    if (a === "pin" || a === "unpin") update({ isPinned: a === "pin" });
    if (a === "comments_on" || a === "comments_off") update({ commentsEnabled: a === "comments_on" });
    if (a === "approve" || a === "restore") update({ moderationStatus: "visible" });
    if (a === "remove") {
      update({ moderationStatus: "removed", isPinned: false });
      onDeleted?.(post.id);
    }
  }

  async function saveEdit() {
    setBusy(true);
    const { error } = await supabase.rpc("community_edit_post", { p_post: post.id, p_content: draft, p_link: post.linkUrl });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    setEditing(false);
    update({ content: draft.trim(), editedAt: new Date().toISOString() });
    toast("Publicação editada.");
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.rpc("community_post_action", { p_post: post.id, p_action: "delete" });
    setBusy(false);
    setConfirmDelete(false);
    if (error) return toast(communityError(error.message), true);
    toast("Publicação excluída.");
    onDeleted?.(post.id);
  }

  async function loadComments() {
    const { data } = await supabase
      .from("Comment")
      .select(COMMENT_COLUMNS)
      .eq("postId", post.id)
      .neq("status", "removed")
      .order("createdAt", { ascending: true })
      .limit(100);
    setComments((data ?? []) as unknown as CommentRow[]);
  }
  useEffect(() => {
    if (showComments && comments === null) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !viewer) return;
    setSending(true);
    const { data, error } = await supabase
      .from("Comment")
      .insert({ id: crypto.randomUUID(), postId: post.id, userId: viewer.id, content: text.slice(0, 2000), updatedAt: new Date().toISOString(), parentId: replyTo?.id ?? null })
      .select(COMMENT_COLUMNS)
      .single();
    setSending(false);
    if (error) return toast(communityError(error.message), true);
    setCommentText("");
    setReplyTo(null);
    const row = data as unknown as CommentRow;
    setComments((c) => [...(c ?? []), row]);
    if (row.status === "visible") update({ commentCount: post.commentCount + 1 });
    else toast("Seu comentário foi enviado para aprovação da moderação.");
  }

  async function commentAction(c: CommentRow, a: "approve" | "remove" | "delete") {
    const { error } = await supabase.rpc("community_comment_action", { p_comment: c.id, p_action: a });
    if (error) return toast(communityError(error.message), true);
    if (a === "approve") {
      setComments((l) => (l ?? []).map((x) => (x.id === c.id ? { ...x, status: "visible" } : x)));
      update({ commentCount: post.commentCount + 1 });
    } else {
      setComments((l) => (l ?? []).filter((x) => x.id !== c.id && x.parentId !== c.id));
      if (c.status === "visible") update({ commentCount: Math.max(0, post.commentCount - 1) });
    }
  }

  const tag = post.meta.tag ? TAG_LABEL[post.meta.tag] : null;
  const video = post.media.find((m) => m.type === "video");
  const audio = post.media.find((m) => m.type === "audio");
  const files = post.media.filter((m) => m.type === "file");
  const images = post.media.filter((m) => m.type === "image");
  const canComment = !!viewer && post.commentsEnabled && post.moderationStatus === "visible" && can(community, role, "comment");

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 text-left text-sm transition hover:bg-white/[0.05]",
        danger ? "text-red-300" : "text-white/90"
      )}
    >
      {icon} {label}
    </button>
  );

  const renderComment = (c: CommentRow, isReply: boolean) => (
    <div className="flex items-start gap-2">
      <Avatar name={c.user.name} url={c.user.avatarUrl} size={isReply ? 26 : 30} />
      <div className="min-w-0 flex-1">
        <div className={clsx("inline-block max-w-full rounded-2xl px-3 py-2", c.status === "pending" ? "border border-dashed border-amber-400/40 bg-amber-400/[0.05]" : "bg-white/[0.05]")}>
          <Link href={`/perfil/${c.user.username}`} className="text-xs font-semibold text-white hover:underline">
            {c.user.name}
          </Link>
          <RichText text={c.content} className="whitespace-pre-wrap break-words text-[13px] text-white/80" />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2 text-[11px] text-white/40">
          <span>{timeAgo(c.createdAt)}</span>
          {c.status === "pending" && <span className="text-amber-400">aguardando aprovação</span>}
          {canComment && c.status === "visible" && (
            <button
              type="button"
              onClick={() => {
                setReplyTo(c);
                setCommentText((t) => (t.startsWith(`@${c.user.username}`) ? t : `@${c.user.username} ${t}`));
                commentInput.current?.focus();
              }}
              className="flex items-center gap-1 font-semibold text-white/60 hover:text-white"
            >
              <Reply className="h-3 w-3" /> Responder
            </button>
          )}
          {staff && c.status === "pending" && (
            <button type="button" onClick={() => commentAction(c, "approve")} className="font-semibold text-emerald-400 hover:underline">
              Aprovar
            </button>
          )}
          {staff && c.userId !== viewer?.id && (
            <button type="button" onClick={() => commentAction(c, "remove")} className="font-semibold text-red-300 hover:underline">
              Remover
            </button>
          )}
          {c.userId === viewer?.id && (
            <button type="button" onClick={() => commentAction(c, "delete")} className="hover:text-white">
              Excluir
            </button>
          )}
          {viewer && c.userId !== viewer.id && !staff && (
            <button type="button" onClick={() => setReport({ type: "community_comment", id: c.id, label: "comentário" })} className="hover:text-white">
              Denunciar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <article
      ref={ref}
      className={clsx(
        "rounded-3xl border bg-space-card/90 p-4 transition md:p-5",
        highlight ? "border-orbit-purple/50 shadow-[0_0_30px_rgb(var(--app-accent,139_92_246)/0.2)]" : "border-white/[0.08]",
        post.moderationStatus !== "visible" && "border-dashed"
      )}
    >
      {(post.isPinned || tag || post.moderationStatus !== "visible") && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orbit-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-orbit-cyan">
              <Pin className="h-3 w-3" /> Fixada
            </span>
          )}
          {tag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orbit-gradient px-2 py-0.5 text-[11px] font-semibold text-snow">
              {tag.emoji} {tag.label}
            </span>
          )}
          {post.moderationStatus === "pending" && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400">Aguardando aprovação</span>}
          {post.moderationStatus === "removed" && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">Removida pela moderação</span>}
        </div>
      )}

      <header className="flex items-center gap-3">
        {post.authorType === "community" ? (
          // Publicação em nome da comunidade (§8): a autora pública é a comunidade.
          <>
            <Link href={`/comunidades/${community.slug}`} className="shrink-0">
              <Avatar name={community.name} url={community.avatarUrl} size={42} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/comunidades/${community.slug}`} className="flex items-center gap-1 truncate text-sm font-semibold text-white hover:underline">
                <span className="truncate">{community.name}</span>
                {community.isOfficial && <VerifiedBadge />}
              </Link>
              <p className="truncate text-xs text-white/45">
                @{community.username} · {timeAgo(post.createdAt)}
                {post.editedAt && " · editada"}
              </p>
            </div>
          </>
        ) : (
          <>
            <Link href={`/perfil/${post.author.username}`} className="shrink-0">
              <Avatar name={post.author.name} url={post.author.avatarUrl} size={42} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/perfil/${post.author.username}`} className="flex items-center gap-1 truncate text-sm font-semibold text-white hover:underline">
                <span className="truncate">{post.author.name}</span>
                {post.author.isVerified && <VerifiedBadge />}
              </Link>
              <p className="truncate text-xs text-white/45">
                @{post.author.username} · {timeAgo(post.createdAt)}
                {post.editedAt && " · editada"}
              </p>
            </div>
          </>
        )}
        {viewer && (
          <button type="button" onClick={() => setMenu(true)} aria-label="Opções da publicação" className="flex h-10 w-10 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
          </button>
        )}
      </header>

      {editing ? (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={5000}
            rows={4}
            autoFocus
            className="w-full resize-y rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none focus:border-orbit-purple/60"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => (setEditing(false), setDraft(post.content))} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/75">
              Cancelar
            </button>
            <button type="button" onClick={saveEdit} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-orbit-gradient px-4 py-2 text-xs font-semibold text-snow disabled:opacity-60">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      ) : post.kind === "article" ? (
        <div className="mt-3">
          {images[0] && (
            <button type="button" onClick={() => setLightbox(0)} className="mb-3 block w-full overflow-hidden rounded-2xl bg-white/[0.04]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0].url} alt="" loading="lazy" className="max-h-80 w-full object-cover" />
            </button>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-orbit-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-orbit-cyan">📰 Artigo · {Math.max(1, Math.round(post.content.split(/\s+/).length / 200))} min de leitura</span>
          <h3 className="mt-2 font-display text-xl font-bold leading-snug text-white">{post.meta.article?.title}</h3>
          <RichText text={post.content} className={clsx("mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85", !expanded && "line-clamp-[8]")} />
          {!expanded && post.content.length > 600 && (
            <button type="button" onClick={() => setExpanded(true)} className="mt-1 text-sm font-semibold text-orbit-cyan">
              Continuar lendo
            </button>
          )}
        </div>
      ) : (
        post.content && <RichText text={post.content} className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/90" />
      )}

      {post.kind !== "article" && <MediaGrid post={post} onOpen={setLightbox} />}
      {video && post.meta.video?.title && <p className="mt-3 font-semibold text-white">{post.meta.video.title}</p>}
      {video && (
        <div className={clsx("mt-3 overflow-hidden rounded-2xl bg-black", post.kind === "clip" && "mx-auto max-w-[340px]")}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={video.url} poster={video.thumbnailUrl ?? undefined} controls playsInline preload="metadata" className={clsx("w-full", post.kind === "clip" ? "aspect-[9/16] object-cover" : "max-h-[520px]")} />
        </div>
      )}
      {audio && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgb(var(--app-accent,139_92_246)/0.16),transparent_70%)] p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orbit-gradient text-snow shadow-glow">
            <Music2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{post.meta.music?.title || "Áudio"}</p>
            {post.meta.music?.artist && <p className="truncate text-xs text-white/50">{post.meta.music.artist}</p>}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={audio.url} controls preload="none" className="mt-1.5 h-9 w-full" />
          </div>
        </div>
      )}
      {files.map((f) => (
        <a
          key={f.id}
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-orbit-purple/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-orbit-cyan">
            <FileText className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{decodeURIComponent(f.url.split("/").pop() ?? "Arquivo")}</span>
            <span className="block text-xs text-white/45">{f.mimeType === "application/pdf" ? "PDF" : f.mimeType === "application/zip" ? "ZIP" : "Arquivo"} · toque para abrir</span>
          </span>
        </a>
      ))}
      {post.kind === "poll" && post.meta.poll && <Poll post={post} onVoted={(p) => update({ poll: p })} />}
      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-orbit-cyan/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orbit-cyan/10 text-orbit-cyan">
            <Link2 className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{(() => { try { return new URL(post.linkUrl).hostname.replace(/^www\./, ""); } catch { return "Link"; } })()}</span>
            <span className="block truncate text-xs text-white/45">{post.linkUrl}</span>
          </span>
        </a>
      )}

      {post.moderationStatus === "visible" && (
        <footer className="mt-3.5 flex items-center gap-1 border-t border-white/[0.06] pt-2.5 text-xs text-white/55">
          <ReactionButton mine={reaction} count={likes} top={top} onPick={react} onShowList={openReactors} />
          <button
            type="button"
            onClick={() => setShowComments((s) => !s)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 transition hover:bg-white/5"
            aria-label="Comentários"
          >
            {post.commentsEnabled ? <MessageCircle className="h-[18px] w-[18px]" /> : <MessageSquareOff className="h-[18px] w-[18px]" />} {compactNumber(post.commentCount)}
          </button>
          <button type="button" onClick={() => setShareOpen(true)} className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 transition hover:bg-white/5" aria-label="Compartilhar">
            <Share2 className="h-[18px] w-[18px]" /> {post.shareCount > 0 && compactNumber(post.shareCount)}
          </button>
          <span className="ml-auto flex items-center gap-1 px-2" title="Visualizações">
            <Eye className="h-4 w-4" /> {compactNumber(post.viewCount)}
          </span>
          <button type="button" onClick={toggleSave} aria-pressed={saved} aria-label="Salvar" className={clsx("flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/5", saved && "text-orbit-cyan")}>
            <Bookmark className={clsx("h-[18px] w-[18px]", saved && "fill-current")} />
          </button>
        </footer>
      )}

      {showComments && post.moderationStatus === "visible" && (
        <div className="mt-2 space-y-2.5 border-t border-white/[0.06] pt-3">
          {comments === null ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : comments.length === 0 ? (
            <p className="px-1 text-xs text-white/40">{post.commentsEnabled ? "Seja a primeira pessoa a comentar." : "Comentários desativados."}</p>
          ) : (
            comments
              .filter((c) => !c.parentId || !comments.some((p) => p.id === c.parentId))
              .map((c) => (
                <div key={c.id} className="space-y-2">
                  {renderComment(c, false)}
                  {comments
                    .filter((r) => r.parentId === c.id)
                    .map((r) => (
                      <div key={r.id} className="ml-9 border-l border-white/[0.08] pl-3">
                        {renderComment(r, true)}
                      </div>
                    ))}
                </div>
              ))
          )}
          {canComment ? (
            <form onSubmit={sendComment} className="pt-1">
              {replyTo && (
                <p className="mb-1.5 flex items-center gap-2 px-2 text-[11px] text-white/55">
                  <Reply className="h-3 w-3" /> Respondendo a <strong className="text-white/80">{replyTo.user.name}</strong>
                  <button type="button" onClick={() => (setReplyTo(null), setCommentText(""))} className="ml-auto font-semibold text-white/50 hover:text-white">
                    Cancelar
                  </button>
                </p>
              )}
              <div className="flex items-center gap-2">
              <input
                ref={commentInput}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={2000}
                placeholder="Escreva um comentário…"
                className="min-h-[44px] min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
              />
              <button type="submit" disabled={sending || !commentText.trim()} aria-label="Enviar comentário" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-snow disabled:opacity-40">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
              </div>
            </form>
          ) : (
            viewer &&
            post.commentsEnabled && <p className="px-1 text-[11px] text-white/40">Somente {community.permissions.comment === "admins" ? "administradores" : community.permissions.comment === "owner" ? "o proprietário" : "membros"} podem comentar aqui.</p>
          )}
        </div>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title="Publicação">
        <div className="space-y-0.5">
          {mine && menuItem(<Pencil className="h-5 w-5" />, "Editar", () => (setMenu(false), setEditing(true)))}
          {admin && post.moderationStatus === "visible" && menuItem(post.isPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />, post.isPinned ? "Desafixar" : "Fixar no topo", () => action(post.isPinned ? "unpin" : "pin"))}
          {(mine || staff) &&
            post.moderationStatus === "visible" &&
            menuItem(
              post.commentsEnabled ? <MessageSquareOff className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />,
              post.commentsEnabled ? "Desativar comentários" : "Permitir comentários",
              () => action(post.commentsEnabled ? "comments_off" : "comments_on")
            )}
          {staff && post.moderationStatus === "pending" && menuItem(<CheckCircle2 className="h-5 w-5 text-emerald-400" />, "Aprovar publicação", () => action("approve"))}
          {staff && post.moderationStatus === "removed" && menuItem(<RotateCcw className="h-5 w-5" />, "Restaurar", () => action("restore"))}
          {menuItem(<Link2 className="h-5 w-5" />, "Copiar link", () => {
            navigator.clipboard.writeText(url).then(() => toast("Link copiado."));
            setMenu(false);
          })}
          {staff && !mine && post.moderationStatus !== "removed" && menuItem(<ShieldX className="h-5 w-5" />, "Remover (moderação)", () => action("remove"), true)}
          {(mine || admin) && menuItem(<Trash2 className="h-5 w-5" />, "Excluir", () => (setMenu(false), setConfirmDelete(true)), true)}
          {!mine && !staff && menuItem(<Flag className="h-5 w-5" />, "Denunciar", () => (setMenu(false), setReport({ type: "community_post", id: post.id, label: "publicação" })), true)}
        </div>
      </Sheet>

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Compartilhar publicação">
        <div className="space-y-3 pt-1">
          {viewer && !community.isPrivate && post.moderationStatus === "visible" && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Repeat2 className="h-4 w-4 text-orbit-cyan" /> Repostar no seu perfil
              </p>
              <textarea
                value={repostText}
                onChange={(e) => setRepostText(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Adicione um comentário (opcional)"
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-space-bg/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60"
              />
              <button type="button" onClick={repost} disabled={reposting} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-orbit-gradient text-sm font-semibold text-snow disabled:opacity-60">
                {reposting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />} Repostar
              </button>
            </div>
          )}
          {menuItem(<Share2 className="h-5 w-5" />, "Enviar para outro app", nativeShare)}
          {menuItem(<Link2 className="h-5 w-5" />, "Copiar link", () => {
            navigator.clipboard.writeText(url).then(() => toast("Link copiado."));
            setShareOpen(false);
          })}
        </div>
      </Sheet>

      <Sheet open={showReactors} onClose={() => setShowReactors(false)} title={`Reações · ${likes}`}>
        {reactors === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
              <button type="button" onClick={() => setReactorTab("all")} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", reactorTab === "all" ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
                Todas {reactors.length}
              </button>
              {REACTIONS.filter((r) => reactors.some((x) => x.reaction === r.key)).map((r) => (
                <button key={r.key} type="button" onClick={() => setReactorTab(r.key)} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", reactorTab === r.key ? "bg-orbit-gradient text-snow" : "border border-white/10 text-white/65")}>
                  {r.emoji} {reactors.filter((x) => x.reaction === r.key).length}
                </button>
              ))}
            </div>
            <div className="space-y-0.5">
              {reactors
                .filter((r) => reactorTab === "all" || r.reaction === reactorTab)
                .map((r) => (
                  <Link key={r.user.id} href={`/perfil/${r.user.username}`} className="flex min-h-[52px] items-center gap-3 rounded-2xl px-2 hover:bg-white/[0.04]">
                    <Avatar name={r.user.name} url={r.user.avatarUrl} size={38} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{r.user.name}</span>
                    <span className="text-xl">{reactionOf(r.reaction).emoji}</span>
                  </Link>
                ))}
            </div>
          </>
        )}
      </Sheet>

      <Confirm
        open={confirmDelete}
        title="Excluir publicação?"
        message="Ela some da comunidade junto com curtidas e comentários. Não dá para desfazer."
        confirmLabel="Excluir"
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
      <ReportSheet target={report} onClose={() => setReport(null)} />
      {lightbox !== null && images.length > 0 && (
        <Lightbox images={images} start={lightbox} onClose={() => setLightbox(null)} caption={post.content ? <span className="line-clamp-3">{post.content}</span> : undefined} />
      )}
    </article>
  );
}
