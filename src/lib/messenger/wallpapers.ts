import type { CSSProperties } from "react";

/** Chat wallpapers (Messenger → Tema da conversa → Papel de parede), in public/wallpapers. */
export const WALLPAPERS = [
  { id: "universo", label: "Universo" },
  { id: "horizonte", label: "Horizonte" },
  { id: "lua", label: "Lua e Estrelas" },
  { id: "borboleta", label: "Borboleta" },
  { id: "crepusculo", label: "Crepúsculo" },
  { id: "janela", label: "Café no espaço" },
  { id: "companhia", label: "Companhia" },
  { id: "aneis", label: "Anéis" },
] as const;

export function wallpaperSrc(id: string, thumb = false) {
  return `/wallpapers/${id}${thumb ? "-s" : ""}.webp`;
}

export function isWallpaper(id: string | null | undefined): id is string {
  return !!id && WALLPAPERS.some((w) => w.id === id);
}

/**
 * The picture is dark, so the chat area uses dark surfaces on top of it (readable bubbles and
 * text in any app appearance), with a soft shade to keep messages in focus.
 */
export function wallpaperStyle(id: string): CSSProperties {
  return {
    "--c-ink": "255 255 255",
    "--c-space-bg": "5 6 15",
    "--c-space-surface": "11 14 28",
    "--c-space-card": "17 21 42",
    "--c-space-border": "31 37 66",
    "--c-body": "229 231 245",
    colorScheme: "dark",
    color: "rgb(229 231 245)",
    backgroundColor: "rgb(5 6 15)",
    backgroundImage: `linear-gradient(180deg, rgb(5 6 15 / 0.35) 0%, rgb(5 6 15 / 0.18) 40%, rgb(5 6 15 / 0.45) 100%), url(${wallpaperSrc(id)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;
}
