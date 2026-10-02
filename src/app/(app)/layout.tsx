import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { APP_THEME_COOKIE, APP_VISUAL_COOKIE, parseAppTheme, parseAppVisual } from "@/lib/app-theme";
import { AppAccentSync, AppThemeSync, AppVisualSync } from "@/components/app-theme";
import { appAccentVars } from "@/lib/profile-colors";
import { LiveActivityProvider } from "@/components/live-activity";
import { PushPrompt } from "@/components/pwa";
import { AppSidebar, AppTopBar, MobileHeader, MobileTabBar } from "@/components/app-sidebar";
import { AccountSync } from "@/components/account-sync";
import { ChatDock } from "@/components/chat-dock";
import { PublishProvider } from "@/components/publish/publish-provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");

  const { profile } = current;
  const theme = parseAppTheme((await cookies()).get(APP_THEME_COOKIE)?.value);
  const visual = parseAppVisual((await cookies()).get(APP_VISUAL_COOKIE)?.value);
  const { data: badgeRows } = await (await createClient()).rpc("my_badge_counts");
  const initialCounts = Array.isArray(badgeRows) && badgeRows[0] ? badgeRows[0] : undefined;
  // The color chosen in Personalizar perfil tints the whole app for this member.
  const accent = appAccentVars(profile.profileColor);

  return (
    <LiveActivityProvider userId={current.authId} initialCounts={initialCounts}>
      <PublishProvider me={{ id: current.authId, name: profile.name, avatarUrl: profile.avatarUrl }}>
      <div data-app-theme={theme} data-visual={visual} className="min-h-screen bg-space-bg bg-stars" style={accent as React.CSSProperties | undefined}>
        <AppThemeSync theme={theme} />
        <AppVisualSync visual={visual} />
        <AppAccentSync vars={accent} />
        <AccountSync userId={current.authId} name={profile.name} username={profile.username} avatarUrl={profile.avatarUrl} />
        <AppTopBar
          userId={current.authId}
          username={profile.username}
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          presence={profile.presence}
        />
        <MobileHeader
          userId={current.authId}
          username={profile.username}
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          presence={profile.presence}
        />
        <AppSidebar username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} />
        <main className="min-h-screen pb-24 md:ml-64 md:pb-0 md:pt-16">{children}</main>
        <MobileTabBar username={profile.username} />
        <ChatDock me={{ id: current.authId, name: profile.name, username: profile.username, avatarUrl: profile.avatarUrl }} />
        <PushPrompt />
      </div>
      </PublishProvider>
    </LiveActivityProvider>
  );
}
