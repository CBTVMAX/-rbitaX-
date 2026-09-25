// App appearance (Configurações → Aparência). Stored per device in a cookie so the
// server renders the right palette on the first paint, without a flash.
export const APP_THEME_COOKIE = "orbitax-theme";

export const APP_THEMES = ["dark", "light", "auto"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export function parseAppTheme(value: string | null | undefined): AppTheme {
  return APP_THEMES.includes(value as AppTheme) ? (value as AppTheme) : "dark";
}
