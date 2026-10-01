import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { ProfileCommunitiesSettings, type SettingsCommunity } from "@/components/profile-communities-settings";

export const dynamic = "force-dynamic";

export default async function ProfileCommunitiesSettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const supabase = await createClient();

  const [{ data: rows }, { data: hidden }] = await Promise.all([
    supabase
      .from("CommunityMember")
      .select("role, community:Community(id, name, slug, avatarUrl)")
      .eq("userId", current.authId)
      .order("createdAt", { ascending: false }),
    supabase.rpc("profile_hidden_communities", { p_user: current.authId }),
  ]);

  const communities: SettingsCommunity[] = (rows ?? []).flatMap((m) => {
    const c = (m as unknown as { community: Omit<SettingsCommunity, "role"> | Omit<SettingsCommunity, "role">[] | null }).community;
    const community = Array.isArray(c) ? c[0] : c;
    return community ? [{ ...community, role: m.role }] : [];
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-3 py-4 md:px-4 md:py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracoes"
          aria-label="Voltar para Configurações"
          className="rounded-full p-1.5 text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-white md:text-2xl">Comunidades no perfil</h1>
          <p className="text-sm text-white/60">Escolha quais comunidades aparecem publicamente no seu perfil.</p>
        </div>
      </div>
      <ProfileCommunitiesSettings
        userId={current.authId}
        username={current.profile.username}
        communities={communities}
        initialHidden={Array.isArray(hidden) ? (hidden as string[]) : []}
      />
    </div>
  );
}
