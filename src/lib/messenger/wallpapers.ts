import type { CSSProperties } from "react";

/** Chat wallpapers (Messenger → Tema da conversa → Papel de parede), in public/wallpapers. */
export const WALLPAPERS = [
  { id: "orbita-clara", label: "Órbita Clara" },
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

/** Fundo de quem ainda não escolheu um papel de parede: Órbita Clara no tema claro, Universo no escuro. */
export function defaultWallpaper(light: boolean) {
  return light ? "orbita-clara" : "universo";
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
/** Papéis de parede claros: a conversa fica com superfícies claras e tinta escura em cima deles. */
const LIGHT = new Set(["orbita-clara"]);
export function isLightWallpaper(id: string | null | undefined) {
  return !!id && LIGHT.has(id);
}

export function wallpaperStyle(id: string): CSSProperties {
  if (LIGHT.has(id))
    return {
      "--c-ink": "17 20 43",
      "--c-space-bg": "242 243 250",
      "--c-space-surface": "255 255 255",
      "--c-space-card": "234 236 246",
      "--c-space-border": "218 222 236",
      "--c-body": "30 34 62",
      "--chat-bar": "255 255 255",
      "--chat-recv": "255 255 255",
      colorScheme: "light",
      color: "rgb(30 34 62)",
      backgroundColor: "rgb(236 238 250)",
      backgroundImage: `linear-gradient(180deg, rgb(255 255 255 / 0.18) 0%, rgb(255 255 255 / 0.05) 45%, rgb(255 255 255 / 0.25) 100%), url(${wallpaperSrc(id)})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    } as CSSProperties;
  return {
    "--c-ink": "255 255 255",
    "--c-space-bg": "5 6 15",
    "--c-space-surface": "11 14 28",
    "--c-space-card": "17 21 42",
    "--c-space-border": "31 37 66",
    "--c-body": "229 231 245",
    "--chat-bar": "22 23 29",
    "--chat-recv": "42 43 49",
    colorScheme: "dark",
    color: "rgb(229 231 245)",
    backgroundColor: "rgb(5 6 15)",
    // Foto própria pode ser clara: um véu um pouco mais forte mantém as mensagens legíveis.
    backgroundImage: isCustomWallpaper(id)
      ? `linear-gradient(180deg, rgb(5 6 15 / 0.5) 0%, rgb(5 6 15 / 0.32) 40%, rgb(5 6 15 / 0.58) 100%), url("${wallpaperSrc(id)}")`
      : `linear-gradient(180deg, rgb(5 6 15 / 0.35) 0%, rgb(5 6 15 / 0.18) 40%, rgb(5 6 15 / 0.45) 100%), url(${wallpaperSrc(id)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;
}
