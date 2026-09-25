"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { timeAgo, initials } from "@/lib/format";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Pin, PinOff } from "lucide-react";
import { clsx } from "clsx";
import { VerifiedBadge } from "@/components/verified-badge";

export type FeedPost = {
  id: string;
  content: string;
  createdAt: string;
  kind: string;
  author: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean };
  media: { id: string; type: string; url: string }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type CommentRow = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string; username: string; avatarUrl: string | null };
};

export function PostCard({
  post,
  currentUserId,
  pinned = false,
  canPin = false,
}: {
  post: FeedPost;
  currentUserId: string;
  pinned?: boolean;
  canPin?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);

  async function togglePin() {
    setPinBusy(true);
    const { error } = await supabase
      .from("User")
      .update({ pinnedPostId: pinned ? null : post.id })
      .eq("id", currentUserId);
    setPinBusy(false);
    setMenuOpen(false);
    if (!error) router.refresh();
  }
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase.from("Like").delete().eq("postId", post.id).eq("userId", currentUserId);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("Like").insert({
        id: crypto.randomUUID(),
        postId: post.id,
        userId: currentUserId,
      });
    }
    setBusy(false);
  }

  async function loadComments() {
    setShowComments((s) => !s);
    if (comments) return;
    const { data } = await supabase
      .from("Comment")
      .select("id, content, createdAt, user:User(name, username, avatarUrl)")
      .eq("postId", post.id)
      .order("createdAt", { ascending: true });
    setComments(((data as unknown) as CommentRow[]) ?? []);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentText("");
    const { data } = await supabase
      .from("Comment")
      .insert({ id: crypto.randomUUID(), postId: post.id, userId: currentUserId, content: text, updatedAt: new Date().toISOString() })
      .select("id, content, createdAt, user:User(name, username, avatarUrl)")
      .single();
    if (data) {
      setComments((c) => [...(c ?? []), (data as unknown) as CommentRow]);
      setCommentCount((c) => c + 1);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-space-card p-4 md:p-5">
      {pinned && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-orbit-cyan">
          <Pin className="h-3.5 w-3.5" /> Publicação fixada
        </p>
      )}
      <div className="mb-3 flex items-center gap-3">
        <Link href={`/perfil/${post.author.username}`}>
          <Avatar name={post.author.name} url={post.author.avatarUrl} />
        </Link>
        <div className="min-w-0">
          <Link href={`/perfil/${post.author.username}`} className="flex items-center gap-1 text-sm font-semibold text-white hover:underline">
            {post.author.name}
            {post.author.isVerified && <VerifiedBadge />}
          </Link>
          <p className="text-xs text-white/40">
            @{post.author.username} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {canPin && (
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Opções da publicação"
              className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 w-52 overflow-hidden rounded-xl border border-white/10 bg-space-surface shadow-2xl">
                <button
                  type="button"
                  onClick={togglePin}
                  disabled={pinBusy}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
                >
                  {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  {pinned ? "Desafixar do perfil" : "Fixar no perfil"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.content && <p className="mb-3 whitespace-pre-wrap text-sm text-white/90">{post.content}</p>}

      {post.media.length > 0 && (
        <div className={clsx("mb-3 grid gap-1 overflow-hidden rounded-xl", post.media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {post.media.map((m) =>
            m.type === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video key={m.id} src={m.url} controls className="max-h-[480px] w-full bg-black object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.id} src={m.url} alt="" className="max-h-[480px] w-full object-cover" />
            )
          )}
        </div>
      )}

      <div className="flex items-center gap-5 border-t border-white/5 pt-3 text-xs text-white/50">
        <button
          onClick={toggleLike}
          className={clsx("flex items-center gap-1.5 transition", liked ? "text-orbit-pink" : "hover:text-white")}
        >
          <Heart className={clsx("h-4 w-4", liked && "fill-orbit-pink")} />
          {likeCount}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 transition hover:text-white">
          <MessageCircle className="h-4 w-4" />
          {commentCount}
        </button>
        <button className="flex items-center gap-1.5 transition hover:text-white">
          <Share2 className="h-4 w-4" />
        </button>
        <button className="ml-auto transition hover:text-white">
          <Bookmark className="h-4 w-4" />
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
          {comments?.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.user.name} url={c.user.avatarUrl} size={28} />
              <div className="rounded-xl bg-white/5 px-3 py-1.5 text-xs">
                <p className="font-medium text-white">{c.user.name}</p>
                <p className="text-white/70">{c.content}</p>
              </div>
            </div>
          ))}
          {comments?.length === 0 && <p className="text-xs text-white/30">Seja o primeiro a comentar.</p>}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-orbit-purple"
            />
            <button type="submit" className="rounded-full bg-orbit-gradient px-3 py-1.5 text-xs font-semibold text-snow">
              Enviar
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-orbit-gradient text-[11px] font-bold text-snow"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
