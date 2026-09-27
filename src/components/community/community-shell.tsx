import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { getCurrentUser } from "@/lib/current-user";
import { APP_THEME_COOKIE, parseAppTheme } from "@/lib/app-theme";
import { AppAccentSync, AppThemeSync } from "@/components/app-theme";
import { appAccentVars } from "@/lib/profile-colors";
import { LiveActivityProvider } from "@/components/live-activity";
import { AppSidebar, AppTopBar, MobileHeader, MobileTabBar } from "@/components/app-sidebar";
import { PublicHeader } from "@/components/public-header";

type Current = Awaited<ReturnType<typeof getCurrentUser>>;

/** Same chrome as the signed-in app (top bar, side menu, bottom tabs); public header for visitors. */
export async function CommunityShell({ current, children }: { current: Current; children: React.ReactNode }) {
  if (!current) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-space-bg bg-stars">
        <div className="pointer-events-none absolute inset-0 bg-orbit-radial" />
        <PublicHeader authed={false} />
        <main className="relative">{children}</main>
      </div>
    );
  }
  const { profile } = current;
  const theme = parseAppTheme(cookies().get(APP_THEME_COOKIE)?.value);
  const { data: badgeRows } = await createClient().rpc("my_badge_counts");
  const initialCounts = Array.isArray(badgeRows) && badgeRows[0] ? badgeRows[0] : undefined;
  const accent = appAccentVars(profile.profileColor);

  return (
    <LiveActivityProvider userId={current.authId} initialCounts={initialCounts}>
      <div data-app-theme={theme} className="min-h-screen bg-space-bg bg-stars" style={accent as React.CSSProperties | undefined}>
        <AppThemeSync theme={theme} />
        <AppAccentSync vars={accent} />
        <AppTopBar userId={current.authId} username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} presence={profile.presence} />
        <MobileHeader userId={current.authId} username={profile.username} presence={profile.presence} />
        <AppSidebar username={profile.username} name={profile.name} avatarUrl={profile.avatarUrl} />
        <main className="min-h-screen pb-24 md:ml-64 md:pb-0 md:pt-16">{children}</main>
        <MobileTabBar username={profile.username} />
      </div>
    </LiveActivityProvider>
  );
}
