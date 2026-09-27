import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { AnnouncementsView } from "@/components/community/pages/announcements";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";
import { loadCommunityPosts } from "@/lib/community-data";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Avisos · ${c.name}` : "Avisos · Órbita X" };
}

export default async function AnnouncementsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, me, membership, canSee, viewer, canAsCommunity } = access;
  const posts = canSee ? await loadCommunityPosts(supabase, community.id, me, { tagged: true, limit: 15 }) : [];
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership} canAsCommunity={canAsCommunity}>
        <AnnouncementsView canSee={canSee} initial={posts} />
      </CommunityProvider>
    </CommunityShell>
  );
}
