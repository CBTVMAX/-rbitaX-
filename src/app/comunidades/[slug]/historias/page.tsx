import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { StoriesArchiveView } from "@/components/community/pages/stories-archive";
import type { Story } from "@/components/community/stories";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";
import { isEditorOrAdmin, STORY_COLUMNS } from "@/lib/communities";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await findCommunity(params.slug);
  return { title: c ? `Arquivo de histórias · ${c.name}` : "Histórias · Órbita X" };
}

export default async function StoriesArchivePage({ params }: { params: { slug: string } }) {
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, me, membership, canSee, viewer } = access;
  let stories: Story[] = [];
  if (canSee && me) {
    // RLS: authors always see their own stories and the team sees all of the community's, expired or not.
    let q = supabase.from("Moment").select(STORY_COLUMNS).eq("communityId", community.id);
    if (!isEditorOrAdmin(membership.role)) q = q.eq("userId", me);
    const { data } = await q.order("createdAt", { ascending: false }).limit(300);
    stories = ((data ?? []) as unknown as Story[]).filter((s) => s.user);
  }
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <StoriesArchiveView canSee={canSee && !!me} stories={stories} />
      </CommunityProvider>
    </CommunityShell>
  );
}
