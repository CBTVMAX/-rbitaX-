import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { MembersView, type MemberRow } from "@/components/community/pages/members";
import { MEMBER_COLUMNS } from "@/lib/communities";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await findCommunity(params.slug);
  return { title: c ? `Membros · ${c.name}` : "Membros · Órbita X" };
}

export default async function MembersPage({ params }: { params: { slug: string } }) {
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, membership, canSee, viewer } = access;
  let members: MemberRow[] = [];
  if (canSee) {
    const { data } = await supabase.from("CommunityMember").select(MEMBER_COLUMNS).eq("communityId", community.id).order("createdAt", { ascending: false }).range(0, 39);
    members = ((data ?? []) as unknown as MemberRow[]).filter((m) => m.user);
  }
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <MembersView canSee={canSee} initial={members} />
      </CommunityProvider>
    </CommunityShell>
  );
}
