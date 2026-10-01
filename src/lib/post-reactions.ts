import { reactionOf, type ReactionKey } from "@/lib/communities";

/** Junta as curtidas de vários posts: total, as 3 reações mais usadas e a reação de quem está vendo. */
export function summarizeReactions(rows: { postId: string; userId?: string; reaction: string | null }[], viewerId: string | null | undefined) {
  const total = new Map<string, number>();
  const byKind = new Map<string, Map<string, number>>();
  const mine = new Map<string, ReactionKey>();
  for (const r of rows) {
    total.set(r.postId, (total.get(r.postId) ?? 0) + 1);
    const key = reactionOf(r.reaction).key;
    const m = byKind.get(r.postId) ?? new Map<string, number>();
    m.set(key, (m.get(key) ?? 0) + 1);
    byKind.set(r.postId, m);
    if (viewerId && r.userId === viewerId) mine.set(r.postId, key);
  }
  const top = (postId: string) =>
    [...(byKind.get(postId)?.entries() ?? [])]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k as ReactionKey);
  return { count: (id: string) => total.get(id) ?? 0, mine: (id: string) => mine.get(id) ?? null, top };
}
