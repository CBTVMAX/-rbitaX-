import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AppSidebar, AppTopBar, MobileHeader, MobileTabBar } from "@/components/app-sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const { profile } = current;

  return (
    <div className="min-h-screen bg-space-bg bg-stars">
      <AppTopBar username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} />
      <MobileHeader username={profile.username} />
      <AppSidebar username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} />
      <main className="min-h-screen pb-24 md:ml-64 md:pb-0 md:pt-16">{children}</main>
      <MobileTabBar username={profile.username} />
    </div>
  );
}
