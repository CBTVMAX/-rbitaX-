import type { CSSProperties } from "react";

/** Chat wallpapers (Messenger → Tema da conversa → Papel de parede), in public/wallpapers. */
export const WALLPAPERS = [
  { id: "doodles", label: "Doodles Órbita" },
  { id: "universo", label: "Universo" },
  { id: "horizonte", label: "Horizonte" },
  { id: "lua", label: "Lua e Estrelas" },
  { id: "borboleta", label: "Borboleta" },
  { id: "crepusculo", label: "Crepúsculo" },
  { id: "janela", label: "Café no espaço" },
  { id: "companhia", label: "Companhia" },
  { id: "aneis", label: "Anéis" },
] as const;

/**
 * Foto da própria pessoa como papel de parede: "custom:<id>/wallpapers/<arquivo>" no bucket público
 * "media". Só quem escolheu vê (a escolha fica na configuração da conversa de cada um).
 */
const CUSTOM = /^custom:([0-9a-f-]{36}\/wallpapers\/[0-9a-f-]{36}\.(?:webp|jpg))$/;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function isCustomWallpaper(id: string | null | undefined): id is string {
  return !!id && CUSTOM.test(id);
}

export function customWallpaperId(path: string) {
  return `custom:${path}`;
}

export function wallpaperSrc(id: string, thumb = false) {
  const custom = id.match(CUSTOM);
  if (custom) return `${SUPABASE_URL}/storage/v1/object/public/media/${custom[1]}`;
  return `/wallpapers/${id}${thumb ? "-s" : ""}.webp`;
}

export function isWallpaper(id: string | null | undefined): id is string {
  return !!id && (WALLPAPERS.some((w) => w.id === id) || CUSTOM.test(id));
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
    // Foto própria pode ser clara: um véu um pouco mais forte mantém as mensagens legíveis.
    // Doodles já é um fundo calmo: quase sem véu, para ficar azul vivo como no app.
    backgroundImage: id === "doodles"
      ? `linear-gradient(180deg, rgb(5 6 15 / 0.12) 0%, rgb(5 6 15 / 0.05) 50%, rgb(5 6 15 / 0.18) 100%), url(${wallpaperSrc(id)})`
      : isCustomWallpaper(id)
      ? `linear-gradient(180deg, rgb(5 6 15 / 0.5) 0%, rgb(5 6 15 / 0.32) 40%, rgb(5 6 15 / 0.58) 100%), url("${wallpaperSrc(id)}")`
      : `linear-gradient(180deg, rgb(5 6 15 / 0.35) 0%, rgb(5 6 15 / 0.18) 40%, rgb(5 6 15 / 0.45) 100%), url(${wallpaperSrc(id)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;
}
