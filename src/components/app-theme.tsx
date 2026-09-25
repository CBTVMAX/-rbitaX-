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
