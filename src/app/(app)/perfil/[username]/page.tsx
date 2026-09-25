import { notFound, redirect } from "next/navigation";
import { parseFriendState } from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import type { FeedPost } from "@/components/post-card";
import {
  ProfileView,
  type ProfileCommunity,
  type ProfileFriend,
  type ProfileInfo,
} from "@/components/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const current = await getCurrentUser();

  const { data: user } = await supabase
    .from("User")
    .select("*, profile:Profile(*)")
    .eq("username", params.username.toLowerCase())
    .maybeSingle();

  if (!user) {
    // Old links may still use the initial numeric @ (the permanent Orbit ID): send them to the current @.
    if (/^[0-9]+$/.test(params.username)) {
      const { data: byOrbitId } = await supabase
        .from("User")
        .select("username")
        .eq("orbitId", params.username)
        .maybeSingle();
      if (byOrbitId) redirect(`/perfil/${byOrbitId.username}`);
    }
    notFound();
  }

  const [
    { data: followerRows },
    { data: followingRows },
    { count: postCount },
    { data: membershipRows },
    { data: myFollow },
    { data: friendshipRows },
    { data: friendStateRaw },
    { data: incomingRows },
  ] = await Promise.all([
    supabase.from("Follow").select("followerId").eq("followingId", user.id),
    supabase.from("Follow").select("followingId").eq("followerId", user.id),
    supabase.from("Post").select("id", { count: "exact", head: true }).eq("authorId", user.id),
    supabase
      .from("CommunityMember")
      .select("role, community:Community(id, name, slug, avatarUrl)")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false }),
    current
      ? supabase.from("Follow").select("id").eq("followerId", current.authId).eq("followingId", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Accepted friendships of this profile (requests go through send/respond_friend_request).
    supabase
      .from("Friendship")
      .select("requesterId, addresseeId")
      .eq("status", "accepted")
      .or(`requesterId.eq.${user.id},addresseeId.eq.${user.id}`)
      .order("respondedAt", { ascending: false })
      .limit(500),
    current && current.authId !== user.id
      ? supabase.rpc("friendship_state", { other_user_id: user.id })
      : Promise.resolve({ data: null }),
    // Pending requests the owner still has to answer.
    current && current.authId === user.id
      ? supabase
          .from("Friendship")
          .select("requesterId, createdAt")
          .eq("addresseeId", user.id)
          .eq("status", "pending")
          .order("createdAt", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as { requesterId: string; createdAt: string }[] }),
  ]);

  const followerIds = new Set((followerRows ?? []).map((f) => f.followerId));
  const followingIds = (followingRows ?? []).map((f) => f.followingId);
  const friendIds = (friendshipRows ?? []).map((f) => (f.requesterId === user.id ? f.addresseeId : f.requesterId));
  const requesterIds = (incomingRows ?? []).map((r) => r.requesterId);

  const userCard = "id, name, username, avatarUrl, presence, isVerified" as const;
  const [{ data: friendRows }, { data: requesterRows }] = await Promise.all([
    friendIds.length
      ? supabase.from("User").select(userCard).in("id", friendIds.slice(0, 60)).order("name")
      : Promise.resolve({ data: [] as ProfileFriend[] }),
    requesterIds.length
      ? supabase.from("User").select(userCard).in("id", requesterIds)
      : Promise.resolve({ data: [] as ProfileFriend[] }),
  ]);
  const requesterById = new Map((requesterRows ?? []).map((u) => [u.id, u]));
  const friendRequests = requesterIds.flatMap((id) => {
    const u = requesterById.get(id);
    return u ? [u] : [];
  });

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

  const communities: ProfileCommunity[] = (membershipRows ?? []).flatMap((m) => {
    const c = (m as unknown as { community: Omit<ProfileCommunity, "role"> | Omit<ProfileCommunity, "role">[] | null }).community;
    const community = Array.isArray(c) ? c[0] : c;
    return community ? [{ ...community, role: m.role }] : [];
  });

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
        friends: friendIds.length,
        followers: followerIds.size,
        following: followingIds.length,
        communities: communities.length,
      }}
      feed={feed}
      pinnedPostId={pinnedPostId}
      communities={communities}
      friends={friendRows ?? []}
      friendState={parseFriendState(friendStateRaw as string | null)}
      friendRequests={friendRequests}
    />
  );
}
