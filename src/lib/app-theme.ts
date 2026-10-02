// App appearance (Configurações → Aparência). Stored per device in a cookie so the
// server renders the right palette on the first paint, without a flash.
export const APP_THEME_COOKIE = "orbitax-theme";

export const APP_THEMES = ["dark", "light", "auto"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export function parseAppTheme(value: string | null | undefined): AppTheme {
  return APP_THEMES.includes(value as AppTheme) ? (value as AppTheme) : "dark";
}

// Visual (Configurações → Aparência → Visual): "simples" tira estrelas, brilhos e papéis de parede
// ilustrados (o Messenger usa fundo liso) para quem prefere uma tela limpa. Também por aparelho.
export const APP_VISUAL_COOKIE = "orbitax-visual";

export const APP_VISUALS = ["completo", "simples"] as const;
export type AppVisual = (typeof APP_VISUALS)[number];

export function parseAppVisual(value: string | null | undefined): AppVisual {
  return value === "simples" ? "simples" : "completo";
}
