import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Drama } from "lucide-react";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { SubpageFrame } from "@/components/community/subpage";
import { RpgCharactersView } from "@/components/community/rpg/characters-view";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Personagens · ${c.name}` : "Personagens · Órbita X" };
}

export default async function CharactersPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, membership, canSee, viewer } = access;
  if (!community.isRpg) notFound();
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <SubpageFrame title="Personagens / Fichas" icon={<Drama className="h-5 w-5 text-orbit-cyan" />} canSee={canSee} wide>
          <RpgCharactersView canSee={canSee} />
        </SubpageFrame>
      </CommunityProvider>
    </CommunityShell>
  );
}
