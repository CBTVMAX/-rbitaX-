import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import type { FeedPost } from "@/components/post-card";
import { ProfileView, type ProfileInfo } from "@/components/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const current = await getCurrentUser();

  const { data: user } = await supabase
    .from("User")
    .select("*, profile:Profile(*)")
    .eq("username", params.username.toLowerCase())
    .maybeSingle();

  if (!user) notFound();

  const [
    { data: followerRows },
    { data: followingRows },
    { count: postCount },
    { count: communityCount },
    { data: myFollow },
  ] = await Promise.all([
    supabase.from("Follow").select("followerId").eq("followingId", user.id),
    supabase.from("Follow").select("followingId").eq("followerId", user.id),
    supabase.from("Post").select("id", { count: "exact", head: true }).eq("authorId", user.id),
    supabase.from("CommunityMember").select("id", { count: "exact", head: true }).eq("userId", user.id),
    current
      ? supabase.from("Follow").select("id").eq("followerId", current.authId).eq("followingId", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const followerIds = new Set((followerRows ?? []).map((f) => f.followerId));
  const followingIds = (followingRows ?? []).map((f) => f.followingId);
  const friendCount = followingIds.filter((id) => followerIds.has(id)).length;

  const postSelect =
    "id, content, createdAt, kind, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url)" as const;

  const { data: recentPosts } = await supabase
    .from("Post")
    .select(postSelect)
    .eq("authorId", user.id)
    .order("createdAt", { ascending: false })
    .limit(20);

  let posts = recentPosts ?? [];
  if (user.pinnedPostId && !posts.some((p) => p.id === user.pinnedPostId)) {
    const { data: pinnedRow } = await supabase
      .from("Post")
      .select(postSelect)
      .eq("id", user.pinnedPostId)
      .eq("authorId", user.id)
      .maybeSingle();
    if (pinnedRow) posts = [pinnedRow, ...posts];
  }
  const pinnedPostId = user.pinnedPostId && posts.some((p) => p.id === user.pinnedPostId) ? user.pinnedPostId : null;

  const postIds = posts.map((p) => p.id);
  const [{ data: likeRows }, { data: myLikes }, { data: commentRows }] = await Promise.all([
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length && current
      ? supabase.from("Like").select("postId").in("postId", postIds).eq("userId", current.authId)
      : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length ? supabase.from("Comment").select("postId").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
  ]);

  const likeCountByPost = new Map<string, number>();
  (likeRows ?? []).forEach((l) => likeCountByPost.set(l.postId, (likeCountByPost.get(l.postId) ?? 0) + 1));
  const likedSet = new Set((myLikes ?? []).map((l) => l.postId));
  const commentCountByPost = new Map<string, number>();
  (commentRows ?? []).forEach((c) => commentCountByPost.set(c.postId, (commentCountByPost.get(c.postId) ?? 0) + 1));

  const feed: FeedPost[] = posts.map((p) => ({
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,
    kind: p.kind,
    author: p.author as unknown as FeedPost["author"],
    media: (p.media as unknown as FeedPost["media"]) ?? [],
    likeCount: likeCountByPost.get(p.id) ?? 0,
    commentCount: commentCountByPost.get(p.id) ?? 0,
    likedByMe: likedSet.has(p.id),
  }));

  const rawProfile = (user as unknown as { profile?: ProfileInfo | ProfileInfo[] | null }).profile;
  const info = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

  return (
    <ProfileView
      user={user}
      info={info}
      current={current}
      isFollowing={!!myFollow}
      stats={{
        posts: postCount ?? 0,
        friends: friendCount,
        followers: followerIds.size,
        following: followingIds.length,
        communities: communityCount ?? 0,
      }}
      feed={feed}
      pinnedPostId={pinnedPostId}
    />
  );
}
