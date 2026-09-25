import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { APP_THEME_COOKIE, parseAppTheme } from "@/lib/app-theme";
import { AppAccentSync, AppThemeSync } from "@/components/app-theme";
import { appAccentVars } from "@/lib/profile-colors";
import { LiveActivityProvider } from "@/components/live-activity";
import { PushPrompt } from "@/components/pwa";
import { AppSidebar, AppTopBar, MobileHeader, MobileTabBar } from "@/components/app-sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const { profile } = current;
  const theme = parseAppTheme(cookies().get(APP_THEME_COOKIE)?.value);
  const { data: badgeRows } = await createClient().rpc("my_badge_counts");
  const initialCounts = Array.isArray(badgeRows) && badgeRows[0] ? badgeRows[0] : undefined;
  // The color chosen in Personalizar perfil tints the whole app for this member.
  const accent = appAccentVars(profile.profileColor);

  return (
    <LiveActivityProvider userId={current.authId} initialCounts={initialCounts}>
      <div data-app-theme={theme} className="min-h-screen bg-space-bg bg-stars" style={accent as React.CSSProperties | undefined}>
        <AppThemeSync theme={theme} />
        <AppAccentSync vars={accent} />
        <AppTopBar
          userId={current.authId}
          username={profile.username}
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          presence={profile.presence}
        />
        <MobileHeader userId={current.authId} username={profile.username} presence={profile.presence} />
        <AppSidebar username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} />
        <main className="min-h-screen pb-24 md:ml-64 md:pb-0 md:pt-16">{children}</main>
        <MobileTabBar username={profile.username} />
        <PushPrompt />
      </div>
    </LiveActivityProvider>
  );
}
