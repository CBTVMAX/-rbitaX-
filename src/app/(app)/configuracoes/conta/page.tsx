import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { parseInterests } from "@/components/profile-view";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  // The owner's private details (birth date, gender…) come from a function that only
  // returns the signed-in account; they are not readable through the table.
  const { data: rows } = await supabase.rpc("my_account_details");
  const account = Array.isArray(rows) ? rows[0] : null;
  const profile = account?.hasProfileRow ? account : null;

  const user = current.profile;

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 md:px-4 md:py-6 lg:max-w-6xl lg:px-6">
      <div className="mb-4 flex items-center gap-3 lg:mb-6">
        <Link
          href={`/perfil/${user.username}`}
          aria-label="Voltar para o perfil"
          className="rounded-full p-1.5 text-white/80 transition hover:bg-white/5 hover:text-white lg:hidden"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold text-white md:text-2xl lg:text-3xl">Editar perfil</h1>
          <p className="mt-1 hidden text-sm text-white/60 lg:block">
            Atualize suas informações e personalize seu perfil no Órbita X.
          </p>
        </div>
        <Link
          href="/configuracoes/personalizar"
          aria-label="Personalizar perfil"
          className="flex items-center gap-2 rounded-xl border border-white/15 p-2.5 text-sm font-medium text-white transition hover:bg-white/5 lg:px-4"
        >
          <Palette className="h-4 w-4 text-orbit-purple" /> <span className="hidden lg:inline">Personalizar perfil</span>
        </Link>
        <Link
          href={`/perfil/${user.username}`}
          className="hidden items-center gap-2 rounded-xl border border-orbit-purple/60 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orbit-purple/10 lg:flex"
        >
          <Eye className="h-4 w-4" /> Ver meu perfil
        </Link>
      </div>

      <AccountSettingsForm
        userId={current.authId}
        initial={{
          orbitId: user.orbitId,
          name: user.name,
          username: user.username,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          coverUrl: user.coverUrl,
          isPrivate: user.isPrivate,
          location: profile?.location ?? null,
          website: profile?.website ?? null,
          interests: parseInterests(profile?.interests),
          birthDate: profile?.birthDate ?? null,
          gender: profile?.gender ?? null,
          relationshipStatus: profile?.relationshipStatus ?? null,
          showAge: profile?.showAge ?? true,
          showSign: profile?.showSign ?? true,
          showLocation: profile?.showLocation ?? true,
          showInterests: profile?.showInterests ?? true,
          showRelationship: profile?.showRelationship ?? true,
          hasProfileRow: !!profile,
        }}
      />
    </div>
  );
}
