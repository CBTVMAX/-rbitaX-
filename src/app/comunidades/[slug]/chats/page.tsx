import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { CommunityChatsView } from "@/components/community/pages/chats";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Bate-papos · ${c.name}` : "Bate-papos · Órbita X" };
}

export default async function CommunityChatsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, membership, viewer } = access;
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <CommunityChatsView communityId={community.id} isMember={!!membership.role && !membership.banned} me={viewer} />
      </CommunityProvider>
    </CommunityShell>
  );
}
