import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { POST_COLUMNS, type CommunityPost, type PostMeta } from "@/lib/communities";

type Client = SupabaseClient<Database>;

export type PostFilter = {
  kinds?: string[];
  excludeKinds?: string[];
  albumId?: string | null;
  pinned?: boolean;
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
  q = q.eq("moderationStatus", f.status ?? "visible");
  if (f.before) q = q.lt("createdAt", f.before);
  const { data, error } = await q.order("createdAt", { ascending: false }).limit(f.limit ?? 20);
  if (error || !data) return [];
  const rows = data as unknown as (Omit<CommunityPost, "likeCount" | "commentCount" | "shareCount" | "likedByMe" | "poll"> & { meta: PostMeta })[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const polls = rows.filter((r) => r.kind === "poll").map((r) => r.id);

  const [likes, comments, shares, votes] = await Promise.all([
    supabase.from("Like").select("postId, userId").in("postId", ids),
    supabase.from("Comment").select("postId").in("postId", ids).eq("status", "visible"),
    supabase.from("Share").select("postId").in("postId", ids),
    polls.length ? supabase.from("PostPollVote").select("postId, userId, optionIndex").in("postId", polls) : Promise.resolve({ data: [] as { postId: string; userId: string; optionIndex: number }[] }),
  ]);
  const count = (list: { postId: string }[] | null, id: string) => (list ?? []).filter((x) => x.postId === id).length;

  return rows.map((r) => {
    const post: CommunityPost = {
      ...r,
      meta: (r.meta ?? {}) as PostMeta,
      media: [...(r.media ?? [])].sort((a, b) => a.position - b.position),
      likeCount: count(likes.data, r.id),
      commentCount: count(comments.data, r.id),
      shareCount: count(shares.data, r.id),
      likedByMe: !!viewerId && (likes.data ?? []).some((l) => l.postId === r.id && l.userId === viewerId),
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
