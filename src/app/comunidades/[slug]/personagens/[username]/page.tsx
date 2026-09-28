import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Drama } from "lucide-react";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { SubpageFrame } from "@/components/community/subpage";
import { RpgCharacterView } from "@/components/community/rpg/character-view";
import type { RpgCharacter, RpgConfig } from "@/lib/rpg";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string; username: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Ficha · ${c.name}` : "Ficha · Órbita X" };
}

export default async function CharacterSheetPage(props: { params: Promise<{ slug: string; username: string }> }) {
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, membership, canSee, viewer, supabase } = access;
  if (!community.isRpg) notFound();

  const { data: owner } = await supabase.from("User").select("id").eq("username", params.username.toLowerCase()).maybeSingle();
  if (!owner) notFound();

  const [{ data: charRows }, { data: cfgRows }] = await Promise.all([
    supabase.rpc("rpg_character_get", { p_community: community.id, p_user: owner.id }),
    supabase.rpc("rpg_config", { p_community: community.id }),
  ]);
  const character = (Array.isArray(charRows) ? charRows[0] : null) as RpgCharacter | null;
  const config = (Array.isArray(cfgRows) ? cfgRows[0] : null) as RpgConfig | null;
  if (!character || !config) notFound();

  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <SubpageFrame title="Ficha de Personagem" icon={<Drama className="h-5 w-5 text-orbit-cyan" />} canSee={canSee} wide>
          <RpgCharacterView initial={character} config={config} />
        </SubpageFrame>
      </CommunityProvider>
    </CommunityShell>
  );
}
