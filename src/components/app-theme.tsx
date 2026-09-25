"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_THEME_COOKIE, type AppTheme } from "@/lib/app-theme";

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.appTheme = theme;
  document.querySelectorAll<HTMLElement>("[data-app-theme]").forEach((el) => {
    el.dataset.appTheme = theme;
  });
}

/** Mirrors the app appearance on <html> so portals and the page background follow it too. */
export function AppThemeSync({ theme }: { theme: AppTheme }) {
  useEffect(() => {
    applyTheme(theme);
    return () => {
      delete document.documentElement.dataset.appTheme;
    };
  }, [theme]);
  return null;
}

export function useAppTheme(initial: AppTheme) {
  const router = useRouter();
  const [theme, setTheme] = useState<AppTheme>(initial);

  function change(next: AppTheme) {
    setTheme(next);
    document.cookie = `${APP_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    applyTheme(next);
    router.refresh();
  }

  return { theme, change };
}

const ACCENT_VARS = ["--app-accent", "--app-accent-a", "--app-accent-b"];

/** Mirrors the member's color on <html> so dialogs, sheets and the phone chat (portals) use it too. */
export function AppAccentSync({ vars }: { vars: Record<string, string> | undefined }) {
  const key = JSON.stringify(vars ?? null);
  useEffect(() => {
    const root = document.documentElement.style;
    const values: Record<string, string> | null = JSON.parse(key);
    ACCENT_VARS.forEach((v) => (values?.[v] ? root.setProperty(v, values[v]) : root.removeProperty(v)));
    return () => ACCENT_VARS.forEach((v) => root.removeProperty(v));
  }, [key]);
  return null;
}
