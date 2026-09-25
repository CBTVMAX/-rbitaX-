import type { CSSProperties } from "react";

/**
 * Per-conversation themes (Messenger → Tema da conversa). Independent from the app appearance
 * (Configurações → Aparência): they change the chat background glow, accents, sent bubbles and buttons.
 */
export type ChatTheme = {
  id: string;
  label: string;
  /** "r g b" of the accent (buttons, links, ticks, highlights). */
  accent: string;
  /** Sent bubble fill. */
  bubble: string;
  /** Two background glows ("r g b"). */
  glow: [string, string];
  /** Forces light surfaces inside the chat, whatever the app appearance. */
  light?: boolean;
};

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: "padrao",
    label: "Escuro Padrão",
    accent: "139 92 246",
    bubble: "linear-gradient(135deg, #2b6cff 0%, #8b5cf6 55%, #ec4899 100%)",
    glow: ["79 139 255", "168 85 247"],
  },
  {
    id: "nebulosa",
    label: "Azul Nebulosa",
    accent: "59 130 246",
    bubble: "linear-gradient(135deg, #1d4ed8 0%, #2b6cff 45%, #22d3ee 100%)",
    glow: ["37 99 235", "34 211 238"],
  },
  {
    id: "galaxia",
    label: "Roxo Galáxia",
    accent: "168 85 247",
    bubble: "linear-gradient(135deg, #5b21b6 0%, #8b5cf6 50%, #d946ef 100%)",
    glow: ["124 58 237", "217 70 239"],
  },
  {
    id: "ciano",
    label: "Ciano",
    accent: "34 211 238",
    bubble: "linear-gradient(135deg, #0e7490 0%, #06b6d4 50%, #2dd4bf 100%)",
    glow: ["6 182 212", "45 212 191"],
  },
  {
    id: "rosa",
    label: "Rosa",
    accent: "236 72 153",
    bubble: "linear-gradient(135deg, #be185d 0%, #ec4899 55%, #f472b6 100%)",
    glow: ["236 72 153", "168 85 247"],
  },
  {
    id: "ambar",
    label: "Âmbar",
    accent: "245 158 11",
    bubble: "linear-gradient(135deg, #b45309 0%, #f59e0b 55%, #fbbf24 100%)",
    glow: ["245 158 11", "239 68 68"],
  },
  {
    id: "verde",
    label: "Verde",
    accent: "16 185 129",
    bubble: "linear-gradient(135deg, #047857 0%, #10b981 55%, #34d399 100%)",
    glow: ["16 185 129", "34 211 238"],
  },
  {
    id: "vermelho",
    label: "Vermelho",
    accent: "239 68 68",
    bubble: "linear-gradient(135deg, #991b1b 0%, #ef4444 55%, #fb7185 100%)",
    glow: ["239 68 68", "236 72 153"],
  },
  {
    id: "mono",
    label: "Monocromático",
    accent: "148 163 184",
    bubble: "linear-gradient(135deg, #334155 0%, #475569 55%, #64748b 100%)",
    glow: ["148 163 184", "100 116 139"],
  },
  {
    id: "claro",
    label: "Claro",
    accent: "43 108 255",
    bubble: "linear-gradient(135deg, #2b6cff 0%, #5b8cff 60%, #8b5cf6 100%)",
    glow: ["43 108 255", "139 92 246"],
    light: true,
  },
];

export const DEFAULT_CHAT_THEME = CHAT_THEMES[0];

export function chatTheme(id: string | null | undefined) {
  return CHAT_THEMES.find((t) => t.id === id) ?? DEFAULT_CHAT_THEME;
}

const LIGHT_SURFACES = {
  "--c-ink": "17 20 43",
  "--c-space-bg": "242 243 250",
  "--c-space-surface": "255 255 255",
  "--c-space-card": "234 236 246",
  "--c-space-border": "218 222 236",
  "--c-body": "30 34 62",
  colorScheme: "light",
  color: "rgb(30 34 62)",
};

/** CSS variables for a chat area: `--chat-accent`, `--chat-bubble`, `--chat-glow-1/2`. */
export function chatThemeStyle(id: string | null | undefined): CSSProperties {
  const t = chatTheme(id);
  return {
    "--chat-accent": t.accent,
    "--chat-bubble": t.bubble,
    "--chat-glow-1": t.glow[0],
    "--chat-glow-2": t.glow[1],
    ...(t.light ? LIGHT_SURFACES : {}),
  } as CSSProperties;
}
