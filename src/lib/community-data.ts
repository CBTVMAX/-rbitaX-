import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { POST_COLUMNS, type CommunityPost, type PostMeta, type ReactionKey } from "@/lib/communities";

type Client = SupabaseClient<Database>;

export type PostFilter = {
  kinds?: string[];
  excludeKinds?: string[];
  albumId?: string | null;
  pinned?: boolean;
  /** Only announcements (posts with a tag such as Aviso, Evento, Novidade…). */
  tagged?: boolean;
  /** One announcement type (anuncio, evento, novidade…). */
  tag?: string;
  status?: "visible" | "pending" | "removed";
  before?: string;
  limit?: number;
  ids?: string[];
};

/** Posts of a community (RLS decides what this person may see) plus likes, comments, shares and poll results. */
export async function loadCommunityPosts(supabase: Client, communityId: string, viewerId: string | null, f: PostFilter = {}): Promise<CommunityPost[]> {
  let q = supabase.from("Post").select(POST_COLUMNS).eq("communityId", communityId);
  if (f.ids) q = q.in("id", f.ids);
  if (f.kinds) q = q.in("kind", f.kinds);
  if (f.excludeKinds) for (const k of f.excludeKinds) q = q.neq("kind", k);
  if (f.albumId !== undefined) q = f.albumId === null ? q.is("albumId", null) : q.eq("albumId", f.albumId);
  if (f.pinned !== undefined) q = q.eq("isPinned", f.pinned);
  if (f.tagged) q = q.not("meta->>tag", "is", null);
  if (f.tag) q = q.eq("meta->>tag", f.tag);
  q = q.eq("moderationStatus", f.status ?? "visible");
  if (f.before) q = q.lt("createdAt", f.before);
  const { data, error } = await q.order("createdAt", { ascending: false }).limit(f.limit ?? 20);
  if (error || !data) return [];
  const rows = data as unknown as (Omit<CommunityPost, "likeCount" | "commentCount" | "shareCount" | "likedByMe" | "myReaction" | "topReactions" | "poll"> & { meta: PostMeta })[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const polls = rows.filter((r) => r.kind === "poll").map((r) => r.id);

  const [likes, comments, shares, votes] = await Promise.all([
    supabase.from("Like").select("postId, userId, reaction").in("postId", ids),
    supabase.from("Comment").select("postId").in("postId", ids).eq("status", "visible"),
    supabase.from("Share").select("postId").in("postId", ids),
    polls.length ? supabase.from("PostPollVote").select("postId, userId, optionIndex").in("postId", polls) : Promise.resolve({ data: [] as { postId: string; userId: string; optionIndex: number }[] }),
  ]);
  const count = (list: { postId: string }[] | null, id: string) => (list ?? []).filter((x) => x.postId === id).length;

  const reactionsOf = (id: string) => {
    const tally = new Map<ReactionKey, number>();
    (likes.data ?? []).filter((l) => l.postId === id).forEach((l) => tally.set(l.reaction as ReactionKey, (tally.get(l.reaction as ReactionKey) ?? 0) + 1));
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  };

  return rows.map((r) => {
    const myLike = viewerId ? (likes.data ?? []).find((l) => l.postId === r.id && l.userId === viewerId) : undefined;
    const post: CommunityPost = {
      ...r,
      meta: (r.meta ?? {}) as PostMeta,
      media: [...(r.media ?? [])].sort((a, b) => a.position - b.position),
      likeCount: count(likes.data, r.id),
      commentCount: count(comments.data, r.id),
      shareCount: count(shares.data, r.id),
      likedByMe: !!myLike,
      myReaction: (myLike?.reaction as ReactionKey) ?? null,
      topReactions: reactionsOf(r.id),
    };
    if (r.kind === "poll" && post.meta.poll) {
      const mine = (votes.data ?? []).filter((v) => v.postId === r.id);
      post.poll = {
        counts: post.meta.poll.options.map((_, i) => mine.filter((v) => v.optionIndex === i).length),
        mine: mine.filter((v) => v.userId === viewerId).map((v) => v.optionIndex),
        voters: new Set(mine.map((v) => v.userId)).size,
      };
    }
    return post;
  });
}
