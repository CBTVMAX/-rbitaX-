import { findCommunity } from "@/lib/community-server";
import { createClient } from "@/lib/supabase/server";
import { AgeGate } from "@/components/community/manage/growth";

/**
 * Restrição por idade (Gerenciar → Privacidade): em comunidades 16+/18+, quem não tem a idade
 * mínima na data de nascimento vê o aviso em vez de qualquer página da comunidade.
 * Membros e equipe sempre entram (a regra fica em community_age_ok, no banco).
 */
export default async function CommunityLayout(props: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const community = await findCommunity(slug);
  if (community && (community.ageLimit ?? 0) > 0) {
    const { data: ok } = await (await createClient()).rpc("community_age_ok", { p_community: community.id });
    if (ok === false) return <AgeGate limit={community.ageLimit ?? 18} name={community.name} />;
  }
  return props.children;
}
