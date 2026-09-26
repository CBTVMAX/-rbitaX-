import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { CommunityShell } from "@/components/community/community-shell";
import { DiscussionView, type Reply } from "@/components/community/discussion-view";
import { findCommunity } from "@/lib/community-server";
import { DISCUSSION_COLUMNS, type Discussion, type Role } from "@/lib/communities";

export const dynamic = "force-dynamic";

const ID = /^[0-9a-f-]{36}$/;

async function load(slug: string, id: string) {
  if (!ID.test(id)) return null;
  const community = await findCommunity(slug);
  if (!community) return null;
  const { data } = await createClient().from("CommunityDiscussion").select(DISCUSSION_COLUMNS).eq("id", id).eq("communityId", community.id).maybeSingle();
  return data ? { community, discussion: data as unknown as Discussion } : null;
}

export async function generateMetadata({ params }: { params: { slug: string; id: string } }): Promise<Metadata> {
  const r = await load(params.slug, params.id);
  if (!r) return { title: "Discussão · Órbita X" };
  return { title: `${r.discussion.title} · ${r.community.name}`, description: r.community.isPrivate ? undefined : r.discussion.body.slice(0, 160) };
}

export default async function DiscussionPage({ params }: { params: { slug: string; id: string } }) {
  const current = await getCurrentUser();
  const r = await load(params.slug, params.id);
  // RLS only returns the topic to people allowed to see it (private community → members).
  if (!r) notFound();
  const { community, discussion } = r;
  const supabase = createClient();
  const me = current?.authId ?? null;

  const [mine, replies] = await Promise.all([
    me ? supabase.from("CommunityMember").select("role").eq("communityId", community.id).eq("userId", me).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("CommunityDiscussionReply")
      .select("id, content, status, createdAt, userId, user:User!CommunityDiscussionReply_userId_fkey(id, name, username, avatarUrl, isVerified)")
      .eq("discussionId", discussion.id)
      .neq("status", "removed")
      .order("createdAt", { ascending: true })
      .limit(300),
  ]);

  const viewer = current ? { id: current.authId, name: current.profile.name, username: current.profile.username, avatarUrl: current.profile.avatarUrl } : null;

  return (
    <CommunityShell current={current}>
      <DiscussionView
        community={community}
        viewer={viewer}
        role={(mine.data?.role as Role) ?? null}
        discussion={discussion}
        replies={((replies.data ?? []) as unknown as Reply[]).filter((x) => x.user)}
      />
    </CommunityShell>
  );
}
