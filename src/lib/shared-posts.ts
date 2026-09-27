import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** A reposted community publication, as shown inside the reposter's post. */
export type SharedEmbed = {
  id: string;
  content: string;
  kind: string;
  createdAt: string;
  title: string | null;
  image: string | null;
  author: { name: string; username: string; avatarUrl: string | null; isVerified: boolean };
  community: { name: string; slug: string; avatarUrl: string | null } | null;
};

/** Loads the originals of reposts (RLS: only what the viewer may see comes back). */
export async function loadSharedEmbeds(supabase: SupabaseClient<Database>, ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const map = new Map<string, SharedEmbed>();
  if (!unique.length) return map;
  const { data } = await supabase
    .from("Post")
    .select(
      "id, content, kind, createdAt, meta, moderationStatus, author:User!Post_authorId_fkey(name, username, avatarUrl, isVerified), media:Media(type, url, thumbnailUrl, position), community:Community!Post_communityId_fkey(name, slug, avatarUrl)"
    )
    .in("id", unique);
  type Row = {
    id: string;
    content: string;
    kind: string;
    createdAt: string;
    meta: { article?: { title?: string }; video?: { title?: string }; music?: { title?: string } } | null;
    moderationStatus: string;
    author: SharedEmbed["author"] | null;
    media: { type: string; url: string; thumbnailUrl: string | null; position: number }[] | null;
    community: SharedEmbed["community"];
  };
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.author || r.moderationStatus !== "visible") continue;
    const media = [...(r.media ?? [])].sort((a, b) => a.position - b.position);
    const first = media.find((m) => m.type === "image") ?? media.find((m) => m.thumbnailUrl);
    map.set(r.id, {
      id: r.id,
      content: r.content,
      kind: r.kind,
      createdAt: r.createdAt,
      title: r.meta?.article?.title ?? r.meta?.video?.title ?? r.meta?.music?.title ?? null,
      image: first ? (first.type === "image" ? first.url : first.thumbnailUrl) : null,
      author: r.author,
      community: r.community,
    });
  }
  return map;
}
