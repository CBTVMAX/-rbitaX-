import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { AccountSettingsForm } from "@/components/account-settings-form";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("Profile")
    .select("location, website")
    .eq("userId", current.authId)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-white">Conta</h1>
      <AccountSettingsForm
        userId={current.authId}
        initial={{
          name: current.profile.name,
          username: current.profile.username,
          bio: current.profile.bio,
          avatarUrl: current.profile.avatarUrl,
          coverUrl: current.profile.coverUrl,
          isPrivate: current.profile.isPrivate,
          location: profile?.location ?? null,
          website: profile?.website ?? null,
        }}
      />
    </div>
  );
}
