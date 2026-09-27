import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { MomentsView, type Moment } from "@/components/community/pages/moments";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Momentos · ${c.name}` : "Momentos · Órbita X" };
}

export default async function MomentsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, membership, canSee, viewer } = access;
  let moments: Moment[] = [];
  if (canSee) {
    const { data } = await supabase.rpc("community_moments", { p_community: community.id, p_limit: 30 });
    moments = (data ?? []) as unknown as Moment[];
  }
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <MomentsView canSee={canSee} initial={moments} />
      </CommunityProvider>
    </CommunityShell>
  );
}
