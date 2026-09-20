import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { VideoComposer } from "@/components/video-composer";
import { PostCard, type FeedPost } from "@/components/post-card";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  const { data: posts } = await supabase
    .from("Post")
    .select(
      "id, content, createdAt, kind, author:User!Post_authorId_fkey(id, name, username, avatarUrl, isVerified), media:Media(id, type, url)"
    )
    .eq("kind", "video")
    .order("createdAt", { ascending: false })
    .limit(30);

  const postIds = (posts ?? []).map((p) => p.id);
  const [{ data: likeRows }, { data: myLikes }, { data: commentRows }] = await Promise.all([
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds) : Promise.resolve({ data: [] as { postId: string }[] }),
    postIds.length ? supabase.from("Like").select("postId").in("postId", postIds).eq("userId", current.authId) : Promise.resolve({ data: [] as { postId: string }[] }),
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 font-display text-2xl font-bold text-white">Vídeos</h1>
      <p className="mb-6 text-sm text-white/50">Assista, compartilhe e descubra novos mundos.</p>

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
