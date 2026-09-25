import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { Avatar } from "@/components/post-card";
import { PostCard, type FeedPost } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { ProfileTabs } from "@/components/profile-tabs";
import { FollowButton } from "@/components/follow-button";
import { BadgeCheck, CalendarDays, Camera, MapPin, Pencil } from "lucide-react";

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
    { count: followerCount },
    { count: followingCount },
    { count: postCount },
    { count: communityCount },
    { data: myFollow },
  ] = await Promise.all([
    supabase.from("Follow").select("id", { count: "exact", head: true }).eq("followingId", user.id),
    supabase.from("Follow").select("id", { count: "exact", head: true }).eq("followerId", user.id),
    supabase.from("Post").select("id", { count: "exact", head: true }).eq("authorId", user.id),
    supabase.from("CommunityMember").select("id", { count: "exact", head: true }).eq("userId", user.id),
    current
      ? supabase.from("Follow").select("id").eq("followerId", current.authId).eq("followingId", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: posts } = await supabase
    .from("Post")
    .select(
      "id, content, createdAt, kind, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url)"
    )
    .eq("authorId", user.id)
    .order("createdAt", { ascending: false })
    .limit(20);

  const postIds = (posts ?? []).map((p) => p.id);
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

  const feed: FeedPost[] = (posts ?? []).map((p) => ({
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

  const isMe = current?.authId === user.id;
  const profile = (user as unknown as { profile?: { location: string | null; zodiacSign: string | null; showLocation: boolean; showSign: boolean } }).profile;

  const postsSlot = (
    <div className="space-y-4">
      {isMe && (
        <PostComposer userId={current!.authId} name={current!.profile.name} avatarUrl={current!.profile.avatarUrl} />
      )}

      {feed.length === 0 &&
        (isMe ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
            <p className="mb-1">🌌 Seu universo está esperando.</p>
            <p>Comece compartilhando sua primeira publicação.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
            {user.name} ainda não publicou nada.
          </div>
        ))}

      {feed.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={current?.authId ?? ""} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="relative h-40 bg-gradient-to-br from-orbit-blue/40 via-orbit-purple/40 to-orbit-pink/40 md:h-56">
        {user.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
        {isMe && (
          <Link
            href="/configuracoes/conta"
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-space-bg/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-space-bg/90"
          >
            <Camera className="h-3.5 w-3.5" /> Editar capa
          </Link>
        )}
      </div>

      <div className="px-4">
        <div className="-mt-12 flex items-end justify-between">
          <div className="relative rounded-full border-4 border-space-bg">
            <Avatar name={user.name} url={user.avatarUrl} size={96} />
            {isMe && (
              <Link
                href="/configuracoes/conta"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-space-bg bg-space-surface text-white transition hover:bg-white/10"
                aria-label="Alterar foto"
              >
                <Camera className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          {isMe ? (
            <Link
              href="/configuracoes/conta"
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar perfil
            </Link>
          ) : (
            current && <FollowButton targetUserId={user.id} initiallyFollowing={!!myFollow} />
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="text-xl font-bold text-white">{user.name}</h1>
          {user.isVerified && <BadgeCheck className="h-5 w-5 text-orbit-cyan" />}
          <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400" title="Online" />
        </div>
        <p className="text-sm text-white/40">@{user.username}</p>
        {user.orbitId && <p className="text-xs text-white/30">Orbit ID #{user.orbitId}</p>}

        {user.bio ? (
          <p className="mt-2 max-w-lg text-sm text-white/80">{user.bio}</p>
        ) : (
          isMe && (
            <Link href="/configuracoes/conta" className="mt-2 block text-sm text-white/40 hover:text-white/60">
              Adicione uma bio para contar quem você é.
            </Link>
          )
        )}

        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/40">
          {profile?.showLocation && profile?.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </span>
          )}
          {profile?.showSign && profile?.zodiacSign && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {profile.zodiacSign}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-6 border-y border-white/10 py-3 text-sm">
          <span><strong className="text-white">{postCount ?? 0}</strong> <span className="text-white/40">Publicações</span></span>
          <span><strong className="text-white">{followerCount ?? 0}</strong> <span className="text-white/40">Seguidores</span></span>
          <span><strong className="text-white">{followingCount ?? 0}</strong> <span className="text-white/40">Seguindo</span></span>
          <span><strong className="text-white">{communityCount ?? 0}</strong> <span className="text-white/40">Comunidades</span></span>
        </div>
      </div>

      <ProfileTabs postsSlot={postsSlot} />
    </div>
  );
}
