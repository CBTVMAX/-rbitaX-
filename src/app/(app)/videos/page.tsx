import Link from "next/link";
import { redirect } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { VideoComposer } from "@/components/video-composer";
import { summarizeReactions } from "@/lib/post-reactions";
import { PostCard, type FeedPost } from "@/components/post-card";
import { MusicClips, type MusicClip } from "@/components/videos/music-clips";
import { loadCatalog, sortByGenre } from "@/lib/music";

export const dynamic = "force-dynamic";

export default async function VideosPage(props: { searchParams: Promise<{ aba?: string; v?: string }> }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const { aba, v } = await props.searchParams;
  const tab = aba === "publicacoes" ? "publicacoes" : "clipes";

  const supabase = await createClient();

  const tabs = (
    <div className="mb-5 flex gap-1 rounded-2xl border border-white/10 bg-space-surface/80 p-1">
      {[
        { id: "clipes", label: "Clipes musicais", href: "/videos" },
        { id: "publicacoes", label: "Publicações", href: "/videos?aba=publicacoes" },
      ].map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={clsx(
            "flex min-h-[40px] flex-1 items-center justify-center rounded-xl text-sm font-medium transition",
            tab === t.id ? "bg-white/[0.09] text-white" : "text-white/55 hover:text-white"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (tab === "clipes") {
    // Clipes oficiais do catálogo de música (tocam no player oficial do YouTube).
    const tracks = await loadCatalog(supabase, "id, title, artist, genre, youtubeId");
    const clips = sortByGenre(tracks.filter((t) => t.youtubeId)) as unknown as MusicClip[];
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-white">Vídeos</h1>
        <p className="mb-5 text-sm text-white/50">Assista aos clipes oficiais dos maiores sucessos e aos vídeos da comunidade.</p>
        {tabs}
        <MusicClips clips={clips} initialVideo={v ?? null} />
      </div>
    );
  }

  const { data: posts } = await supabase
    .from("Post")
    .select(
      "id, content, createdAt, kind, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url)"
    )
    .eq("kind", "video")
    .is("communityId", null)
    .order("createdAt", { ascending: false })
    .limit(30);

  const postIds = (posts ?? []).map((p) => p.id);
  const [{ data: likeRows }, { data: myLikes }, { data: commentRows }] = await Promise.all([
    postIds.length ? supabase.from("Like").select("postId, userId, reaction").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds).eq("userId", current.authId) : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length ? supabase.from("Comment").select("postId").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
  ]);

  const reactions = summarizeReactions((likeRows ?? []) as { postId: string; userId?: string; reaction: string | null }[], current.authId);
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
    likeCount: reactions.count(p.id),
    commentCount: commentCountByPost.get(p.id) ?? 0,
    likedByMe: likedSet.has(p.id),
    myReaction: reactions.mine(p.id),
    topReactions: reactions.top(p.id),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 font-display text-2xl font-bold text-white">Vídeos</h1>
      <p className="mb-5 text-sm text-white/50">Assista, compartilhe e descubra novos mundos.</p>
      {tabs}

      <VideoComposer userId={current.authId} />

      {feed.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
          Nenhum vídeo publicado ainda.
        </div>
      )}

      <div className="space-y-4">
        {feed.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={current.authId} />
        ))}
      </div>
    </div>
  );
}
