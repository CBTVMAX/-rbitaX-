import { notFound, redirect } from "next/navigation";
import { parseFriendState } from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, PUBLIC_USER_COLUMNS } from "@/lib/current-user";
import type { FeedPost } from "@/components/post-card";
import { loadSharedEmbeds } from "@/lib/shared-posts";
import { computeLevel } from "@/lib/level";
import {
  ProfileView,
  type ProfileCommunity,
  type ProfileFriend,
  type ProfileInfo,
} from "@/components/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage(props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const current = await getCurrentUser();

  const { data: user } = await supabase
    .from("User")
    .select(PUBLIC_USER_COLUMNS)
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
    supabase.from("Post").select("id", { count: "exact", head: true }).eq("authorId", user.id).is("communityId", null),
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
    "id, content, createdAt, kind, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url), sharedPostId" as const;

  const { data: recentPosts } = await supabase
    .from("Post")
    .select(postSelect)
    .eq("authorId", user.id)
    .is("communityId", null)
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
  const [{ data: likeRows }, { data: myLikes }, { data: commentRows }, shared] = await Promise.all([
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length && current
      ? supabase.from("Like").select("postId").in("postId", postIds).eq("userId", current.authId)
      : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length ? supabase.from("Comment").select("postId").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
    loadSharedEmbeds(supabase, posts.map((p) => p.sharedPostId)),
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
    ...(p.sharedPostId ? { shared: shared.get(p.sharedPostId) ?? null } : {}),
  }));

  const communities: ProfileCommunity[] = (membershipRows ?? []).flatMap((m) => {
    const c = (m as unknown as { community: Omit<ProfileCommunity, "role"> | Omit<ProfileCommunity, "role">[] | null }).community;
    const community = Array.isArray(c) ? c[0] : c;
    return community ? [{ ...community, role: m.role }] : [];
  });

  const isMe = current?.authId === user.id;
  // Nível vem de atividade real (posts, seguidores, amizades, comunidades) — nada fictício.
  const level = computeLevel({
    posts: postCount ?? 0,
    followers: followerIds.size,
    friends: friendIds.length,
    communities: communities.length,
    following: followingIds.length,
  });
  // Diamantes = saldo real da carteira; só o dono do perfil vê o próprio saldo.
  let coins: number | null = null;
  if (isMe) {
    const { data: bal } = await supabase.rpc("my_coin_balance");
    coins = typeof bal === "number" ? bal : 0;
  }

  // Privacy (idade, signo, cidade…) is applied by the database for whoever is viewing.
  const { data: detailRows } = await supabase.rpc("public_profile_details", { target_user_id: user.id });
  const info: ProfileInfo | null = Array.isArray(detailRows) && detailRows[0] ? detailRows[0] : null;

  // Cargos e funções: crachás personalizados por comunidade (§18/§41). Só o que o observador pode ver.
  const { data: badgeRows } = await supabase.rpc("community_member_badges", { p_user: user.id });
  const roleBadges: Record<string, { name: string; color: string; icon: string }[]> = {};
  for (const b of (Array.isArray(badgeRows) ? badgeRows : []) as { id: string; badges?: { name: string; color: string; icon: string }[] }[]) {
    if (b?.id && Array.isArray(b.badges) && b.badges.length) roleBadges[b.id] = b.badges;
  }

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
      level={level}
      coins={coins}
      pinnedPostId={pinnedPostId}
      communities={communities}
      roleBadges={roleBadges}
      friends={friendRows ?? []}
      friendState={parseFriendState(friendStateRaw as string | null)}
      friendRequests={friendRequests}
    />
  );
}
