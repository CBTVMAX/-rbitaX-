import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { DiscussionsView } from "@/components/community/pages/discussions";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";
import { DISCUSSION_CATEGORIES, DISCUSSION_COLUMNS, type Discussion, type DiscussionCategory } from "@/lib/communities";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Discussões · ${c.name}` : "Discussões · Órbita X" };
}

export default async function DiscussionsPage(
  props: { params: Promise<{ slug: string }>; searchParams: Promise<{ categoria?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, membership, canSee, viewer } = access;
  const category = DISCUSSION_CATEGORIES.some((c) => c.id === searchParams.categoria) ? (searchParams.categoria as DiscussionCategory) : null;

  let discussions: Discussion[] = [];
  if (canSee) {
    let q = supabase.from("CommunityDiscussion").select(DISCUSSION_COLUMNS).eq("communityId", community.id).eq("status", "visible");
    if (category) q = q.eq("category", category);
    const { data } = await q.order("isPinned", { ascending: false }).order("lastActivityAt", { ascending: false }).limit(25);
    discussions = ((data ?? []) as unknown as Discussion[]).filter((d) => d.author);
  }

  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <DiscussionsView canSee={canSee} initial={discussions} initialCategory={category} />
      </CommunityProvider>
    </CommunityShell>
  );
}
