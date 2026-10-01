import { notFound, redirect } from "next/navigation";
import { parseFriendState } from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, PUBLIC_USER_COLUMNS } from "@/lib/current-user";
import type { FeedPost } from "@/components/post-card";
import { sortMedia } from "@/lib/post-media";
import { loadSharedEmbeds } from "@/lib/shared-posts";
import { computeLevel } from "@/lib/level";
import { summarizeReactions } from "@/lib/post-reactions";
import {
  ProfileView,
  type ProfileCommunity,
  type ProfileFriend,
  type ProfileInfo,
} from "@/components/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage(props: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ arquivo?: string }>;
}) {
  const params = await props.params;
  const search = await props.searchParams;
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
    // Uma @menção pode apontar para uma comunidade: resolve pelo @ ou pelo slug.
    const handle = params.username.toLowerCase();
    const { data: community } = await supabase
      .from("Community")
      .select("slug")
      .or(`username.eq.${handle},slug.eq.${handle}`)
      .maybeSingle();
    if (community) redirect(`/comunidades/${community.slug}`);
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
    { data: blockRow },
  ] = await Promise.all([
    supabase.from("Follow").select("followerId").eq("followingId", user.id),
    supabase.from("Follow").select("followingId").eq("followerId", user.id),
    supabase.from("Post").select("id", { count: "exact", head: true }).eq("authorId", user.id).is("communityId", null).eq("isArchived", false),
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
    // Só enxergo os meus próprios bloqueios (RLS): serve para mostrar "Desbloquear".
    current && current.authId !== user.id
      ? supabase.from("Block").select("id").eq("blockerId", current.authId).eq("blockedId", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const friendIds = (friendshipRows ?? []).map((f) => (f.requesterId === user.id ? f.addresseeId : f.requesterId));
  // Como no VK: quem virou amigo sai de Seguidores/Seguindo e conta só em Amigos.
  const friendSet = new Set(friendIds);
  const followerIds = new Set((followerRows ?? []).map((f) => f.followerId).filter((id) => !friendSet.has(id)));
  const followingIds = (followingRows ?? []).map((f) => f.followingId).filter((id) => !friendSet.has(id));
  const requesterIds = (incomingRows ?? []).map((r) => r.requesterId);

  const userCard = "id, name, username, avatarUrl, presence, isVerified" as const;
  const followerSample = Array.from(followerIds).slice(0, 3);
  // Fotos e vídeos de todas as publicações do perfil (não só das carregadas na página).
  const mediaCount = (type: string) =>
    supabase
      .from("Media")
      .select("id, post:Post!inner(authorId, communityId, isArchived)", { count: "exact", head: true })
      .eq("type", type)
      .eq("post.authorId", user.id)
      .is("post.communityId", null)
      .eq("post.isArchived", false);
  const [{ data: friendRows }, { data: requesterRows }, { data: followerRows2 }, photoCount, videoCount] = await Promise.all([
    friendIds.length
      ? supabase.from("User").select(userCard).in("id", friendIds.slice(0, 60)).order("name")
      : Promise.resolve({ data: [] as ProfileFriend[] }),
    requesterIds.length
      ? supabase.from("User").select(userCard).in("id", requesterIds)
      : Promise.resolve({ data: [] as ProfileFriend[] }),
    followerSample.length
      ? supabase.from("User").select(userCard).in("id", followerSample)
      : Promise.resolve({ data: [] as ProfileFriend[] }),
    mediaCount("image"),
    mediaCount("video"),
  ]);
  const requesterById = new Map((requesterRows ?? []).map((u) => [u.id, u]));
  const friendRequests = requesterIds.flatMap((id) => {
    const u = requesterById.get(id);
    return u ? [u] : [];
  });

  const postSelect =
    "id, content, createdAt, editedAt, kind, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url, position), sharedPostId, visibility, isArchived" as const;

  // "Publicações arquivadas" (menu Mais): só o dono vê, e o perfil mostra apenas o arquivo.
  const showArchive = !!current && current.authId === user.id && search.arquivo === "1";

  const { data: recentPosts } = await supabase
    .from("Post")
    .select(postSelect)
    .eq("authorId", user.id)
    .is("communityId", null)
    .eq("isArchived", showArchive)
    .order("createdAt", { ascending: false })
    .limit(showArchive ? 60 : 20);

  let posts = recentPosts ?? [];
  if (!showArchive && user.pinnedPostId && !posts.some((p) => p.id === user.pinnedPostId)) {
    const { data: pinnedRow } = await supabase
      .from("Post")
      .select(postSelect)
      .eq("id", user.pinnedPostId)
      .eq("authorId", user.id)
      .eq("isArchived", false)
      .maybeSingle();
    if (pinnedRow) posts = [pinnedRow, ...posts];
  }
  const pinnedPostId = !showArchive && user.pinnedPostId && posts.some((p) => p.id === user.pinnedPostId) ? user.pinnedPostId : null;

  const postIds = posts.map((p) => p.id);
  const [{ data: likeRows }, { data: myLikes }, { data: commentRows }, shared, { data: savedRows }] = await Promise.all([
    postIds.length ? supabase.from("Like").select("postId, userId, reaction").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length && current
      ? supabase.from("Like").select("postId").in("postId", postIds).eq("userId", current.authId)
      : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length ? supabase.from("Comment").select("postId").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
    loadSharedEmbeds(supabase, posts.map((p) => p.sharedPostId)),
    postIds.length && current
      ? supabase.from("Bookmark").select("postId").in("postId", postIds).eq("userId", current.authId)
      : Promise.resolve({ data: [] as { postId: string }[] }),
  ]);
  const savedPostIds = (savedRows ?? []).map((r) => r.postId);

  const reactions = summarizeReactions((likeRows ?? []) as { postId: string; userId?: string; reaction: string | null }[], current?.authId);
  const likedSet = new Set((myLikes ?? []).map((l) => l.postId));
  const commentCountByPost = new Map<string, number>();
  (commentRows ?? []).forEach((c) => commentCountByPost.set(c.postId, (commentCountByPost.get(c.postId) ?? 0) + 1));

  const feed: FeedPost[] = posts.map((p) => ({
    id: p.id,
    content: p.content,
    createdAt: p.createdAt,
    editedAt: p.editedAt,
    kind: p.kind,
    author: p.author as unknown as FeedPost["author"],
    media: sortMedia(p.media),
    likeCount: reactions.count(p.id),
    commentCount: commentCountByPost.get(p.id) ?? 0,
    likedByMe: likedSet.has(p.id),
    myReaction: reactions.mine(p.id),
    topReactions: reactions.top(p.id),
    visibility: p.visibility,
    isArchived: p.isArchived,
    ...(p.sharedPostId ? { shared: shared.get(p.sharedPostId) ?? null } : {}),
  }));

  const isMe = current?.authId === user.id;

  // Comunidades que a pessoa escolheu não mostrar no perfil (Configurações → Comunidades no perfil).
  // O dono vê todas (com a marca de oculta); visitantes só recebem as visíveis, filtradas no banco.
  const [{ data: hiddenRaw }, { data: visibleRaw, error: visibleError }] = await Promise.all([
    isMe ? supabase.rpc("profile_hidden_communities", { p_user: user.id }) : Promise.resolve({ data: [] as string[] }),
    !isMe ? supabase.rpc("profile_visible_community_ids", { p_user: user.id }) : Promise.resolve({ data: null, error: null }),
  ]);
  const hiddenCommunityIds = Array.isArray(hiddenRaw) ? (hiddenRaw as string[]) : [];
  const visibleCommunityIds =
    !isMe && !visibleError && Array.isArray(visibleRaw) ? new Set(visibleRaw as unknown as string[]) : null;

  const allCommunities: ProfileCommunity[] = (membershipRows ?? []).flatMap((m) => {
    const c = (m as unknown as { community: Omit<ProfileCommunity, "role"> | Omit<ProfileCommunity, "role">[] | null }).community;
    const community = Array.isArray(c) ? c[0] : c;
    return community ? [{ ...community, role: m.role }] : [];
  });
  const communities = visibleCommunityIds ? allCommunities.filter((c) => visibleCommunityIds.has(c.id)) : allCommunities;
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

  // Parentes (Família) e Depoimentos.
  const [{ data: familyRows }, { data: testimonialRows }, familyReq, testiPend, myTesti] = await Promise.all([
    supabase.rpc("family_of", { p_user_id: user.id }),
    supabase.rpc("testimonials_of", { p_profile_id: user.id }),
    isMe ? supabase.rpc("family_requests") : Promise.resolve({ data: [] }),
    isMe ? supabase.rpc("testimonials_pending") : Promise.resolve({ data: [] }),
    current && !isMe ? supabase.rpc("my_testimonial_for", { p_profile_id: user.id }) : Promise.resolve({ data: [] }),
  ]);
  const myTestimonial = Array.isArray(myTesti.data) && myTesti.data[0] ? myTesti.data[0] : null;

  return (
    <ProfileView
      user={user}
      info={info}
      current={current}
      family={(familyRows ?? []) as never}
      familyRequests={(familyReq.data ?? []) as never}
      testimonials={(testimonialRows ?? []) as never}
      testimonialsPending={(testiPend.data ?? []) as never}
      myTestimonial={myTestimonial as never}
      isFollowing={!!myFollow}
      stats={{
        posts: postCount ?? 0,
        friends: friendIds.length,
        followers: followerIds.size,
        following: followingIds.length,
        communities: communities.length,
        photos: photoCount.error ? null : photoCount.count ?? 0,
        videos: videoCount.error ? null : videoCount.count ?? 0,
      }}
      followerPreview={followerRows2 ?? []}
      feed={feed}
      level={level}
      coins={coins}
      pinnedPostId={pinnedPostId}
      showArchive={showArchive}
      savedPostIds={savedPostIds}
      communities={communities}
      hiddenCommunityIds={hiddenCommunityIds}
      roleBadges={roleBadges}
      friends={friendRows ?? []}
      friendState={parseFriendState(friendStateRaw as string | null)}
      friendRequests={friendRequests}
      blockedByMe={!!blockRow}
    />
  );
}
