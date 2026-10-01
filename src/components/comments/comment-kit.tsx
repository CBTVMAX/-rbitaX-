"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseDbDate } from "@/lib/communities";
import { Avatar } from "@/components/post-card";
import { RichText } from "@/lib/rich-text";

export type CommentUser = { id?: string; name: string; username: string; avatarUrl: string | null };
export type ThreadComment = { id: string; content: string; createdAt: string; userId: string; parentId: string | null; status?: string; user: CommentUser };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "hoje às 16:27", "ontem às 09:10", "28 set às 10:56" (e o ano quando não é o atual). */
export function commentDate(iso: string) {
  const d = parseDbDate(iso);
  const now = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (day === today) return `hoje às ${time}`;
  if (today - day === 86_400_000) return `ontem às ${time}`;
  const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year} às ${time}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Respostas começam com "Nome, …": o nome aparece em destaque, como no VK. */
export function CommentText({ text, names }: { text: string; names: Set<string> }) {
  const m = text.match(/^([^,\n]{1,40}),\s?/);
  if (m && names.has(m[1].trim())) {
    return (
      <span className="whitespace-pre-wrap break-words">
        <span className="font-medium text-orbit-blue">{m[1]}</span>
        <RichText text={text.slice(m[1].length)} />
      </span>
    );
  }
  return (
    <span className="whitespace-pre-wrap break-words">
      <RichText text={text} />
    </span>
  );
}

type LikeState = { count: number; mine: boolean; byAuthor: boolean };

/**
 * Curtidas dos comentários. Se a tabela ainda não existir no banco, `enabled` fica falso e o
 * coração simplesmente não aparece (nada quebra).
 */
export function useCommentLikes(commentIds: string[], viewerId: string | null | undefined, postAuthorId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [enabled, setEnabled] = useState(false);
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const key = commentIds.join(",");

  useEffect(() => {
    if (!commentIds.length) return;
    let alive = true;
    supabase
      .from("CommentLike" as never)
      .select("commentId, userId")
      .in("commentId", commentIds)
      .limit(5000)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) return setEnabled(false);
        setEnabled(true);
        const next: Record<string, LikeState> = {};
        for (const row of (data ?? []) as { commentId: string; userId: string }[]) {
          const s = (next[row.commentId] ??= { count: 0, mine: false, byAuthor: false });
          s.count += 1;
          if (row.userId === viewerId) s.mine = true;
          if (row.userId === postAuthorId) s.byAuthor = true;
        }
        setLikes(next);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, viewerId, postAuthorId, supabase]);

  const toggle = useCallback(
    async (commentId: string) => {
      if (!viewerId) return;
      const cur = likes[commentId] ?? { count: 0, mine: false, byAuthor: false };
      const liking = !cur.mine;
      const apply = (on: boolean) =>
        setLikes((l) => {
          const c = l[commentId] ?? { count: 0, mine: false, byAuthor: false };
          return { ...l, [commentId]: { count: Math.max(0, c.count + (on ? 1 : -1)), mine: on, byAuthor: viewerId === postAuthorId ? on : c.byAuthor } };
        });
      apply(liking);
      const { error } = liking
        ? await supabase.from("CommentLike" as never).insert({ commentId, userId: viewerId } as never)
        : await supabase.from("CommentLike" as never).delete().eq("commentId", commentId).eq("userId", viewerId);
      if (error && error.code !== "23505") apply(!liking);
    },
    [likes, viewerId, postAuthorId, supabase]
  );

  return { enabled, likes, toggle };
}

/** Um comentário no estilo VK: avatar, nome (· Autor), texto, data, Responder e o coração à direita. */
export function CommentItem({
  c,
  isReply,
  isAuthor,
  names,
  like,
  likesEnabled,
  postAuthor,
  onLike,
  onReply,
  highlight,
  extra,
}: {
  c: ThreadComment;
  isReply: boolean;
  isAuthor: boolean;
  names: Set<string>;
  like?: LikeState;
  likesEnabled: boolean;
  postAuthor?: CommentUser | null;
  onLike?: () => void;
  onReply?: () => void;
  highlight?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className={clsx("flex items-start gap-3 rounded-2xl px-2 py-2 transition-colors", isReply && "ml-11", highlight && "bg-orbit-blue/[0.08]")}>
      <Link href={`/perfil/${c.user.username}`} className="shrink-0">
        <Avatar name={c.user.name} url={c.user.avatarUrl} size={isReply ? 30 : 38} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
          <Link href={`/perfil/${c.user.username}`} className="font-semibold text-white hover:underline">
            {c.user.name}
          </Link>
          {isAuthor && <span className="text-[12px] text-white/45">· Autor</span>}
        </p>
        <div className={clsx("mt-0.5 text-[14px] leading-snug text-white/85", c.status === "pending" && "opacity-70")}>
          <CommentText text={c.content} names={names} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/40">
          <span>{commentDate(c.createdAt)}</span>
          {onReply && (
            <button type="button" onClick={onReply} className="font-semibold text-white/55 hover:text-white">
              Responder
            </button>
          )}
          {likesEnabled && like?.byAuthor && postAuthor && (
            <span className="relative" title={`${postAuthor.name} curtiu`}>
              <Avatar name={postAuthor.name} url={postAuthor.avatarUrl} size={18} />
              <Heart className="absolute -bottom-1 -right-1.5 h-3 w-3 fill-orbit-pink text-orbit-pink" />
            </span>
          )}
          {extra}
        </div>
      </div>
      {likesEnabled && onLike && (
        <button
          type="button"
          onClick={onLike}
          aria-pressed={!!like?.mine}
          aria-label={like?.mine ? "Descurtir comentário" : "Curtir comentário"}
          className={clsx("flex shrink-0 items-center gap-1 self-center rounded-full px-1.5 py-1 text-[13px] transition active:scale-90", like?.mine ? "text-orbit-pink" : "text-white/40 hover:text-white")}
        >
          <Heart className={clsx("h-[18px] w-[18px]", like?.mine && "fill-current")} />
          {like && like.count > 0 && <span className="tabular-nums">{like.count}</span>}
        </button>
      )}
    </div>
  );
}

/** Ordena: raízes pela opção escolhida; respostas sempre em ordem de chegada, logo abaixo. */
export type CommentSort = "top" | "new" | "old";
export const SORT_LABEL: Record<CommentSort, string> = { top: "Interessantes primeiro", new: "Novos primeiro", old: "Antigos primeiro" };

export function threadComments<T extends ThreadComment>(list: T[], sort: CommentSort, likeCount: (id: string) => number) {
  const ids = new Set(list.map((c) => c.id));
  const roots = list.filter((c) => !c.parentId || !ids.has(c.parentId));
  const replies = (id: string) => list.filter((r) => r.parentId === id).sort((a, b) => parseDbDate(a.createdAt).getTime() - parseDbDate(b.createdAt).getTime());
  const time = (c: T) => parseDbDate(c.createdAt).getTime();
  const score = (c: T) => likeCount(c.id) * 2 + replies(c.id).length;
  roots.sort((a, b) => (sort === "new" ? time(b) - time(a) : sort === "old" ? time(a) - time(b) : score(b) - score(a) || time(a) - time(b)));
  return roots.map((root) => ({ root, replies: replies(root.id) }));
}
