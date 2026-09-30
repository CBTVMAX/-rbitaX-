import { createClient } from "@/lib/supabase/client";

/**
 * Personal (profile) stories — the same `Moment` rows community stories use, but with no
 * `communityId`. Read straight from the table like the community feed does, letting row-level
 * security decide who sees what.
 */
export type PersonalStory = {
  id: string;
  userId: string;
  type: string;
  mediaUrl: string | null;
  text: string | null;
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  user: { id: string; name: string; username: string; avatarUrl: string | null };
};

const COLUMNS =
  "id, userId, type, mediaUrl, text, expiresAt, createdAt, viewCount, user:User!Moment_userId_fkey(id, name, username, avatarUrl)";

export async function loadPersonalStories(limit = 100): Promise<PersonalStory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Moment")
    .select(COLUMNS)
    .is("communityId", null)
    .gt("expiresAt", new Date().toISOString())
    .order("createdAt", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as PersonalStory[]).filter((s) => s.user);
}

export async function markStorySeen(storyId: string) {
  const supabase = createClient();
  await supabase.rpc("story_view", { p_moment: storyId });
}

export async function deletePersonalStory(storyId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("story_delete", { p_moment: storyId });
  if (error) throw error;
}

/** One bubble per author, newest story first, matching how the strip reads. */
export function groupPersonalStories(
  stories: PersonalStory[],
  seen: Set<string>
): { key: string; name: string; avatarUrl: string | null; stories: PersonalStory[]; seen: boolean }[] {
  const map = new Map<string, ReturnType<typeof groupPersonalStories>[number]>();
  for (const s of stories) {
    const g = map.get(s.userId) ?? {
      key: s.userId,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
      stories: [],
      seen: true,
    };
    g.stories.push(s);
    if (!seen.has(s.id)) g.seen = false;
    map.set(s.userId, g);
  }
  return Array.from(map.values()).sort((a, b) => Number(a.seen) - Number(b.seen));
}
