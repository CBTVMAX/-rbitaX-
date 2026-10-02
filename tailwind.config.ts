import type { Config } from "tailwindcss";

/**
 * Densidade global do Órbita X. Espaçamentos (padding, margin, gap, space-*) usam uma escala mais
 * compacta que a padrão do Tailwind: valores pequenos quase iguais (área de toque e respiro de
 * ícones), valores médios ~15–20% menores e os grandes ~25% menores. Largura/altura (ícones,
 * avatares, botões) e tipografia NÃO mudam aqui — a densidade vem do espaço entre as coisas.
 * Por faixa de tela: celular pequeno um pouco mais justo, telas grandes com um pouco mais de respiro.
 */
/** A escala acompanha a faixa de tela pelo multiplicador --ox-density (definido em globals.css). */
const d = (rem: number) => `calc(${rem}rem * var(--ox-density, 1))`;

const DENSITY: Record<string, string> = {
  "0.5": d(0.125), // 2px
  "1": d(0.25), // 4px
  "1.5": d(0.375), // 6px
  "2": d(0.4375), // 7px  (8)
  "2.5": d(0.5625), // 9px  (10)
  "3": d(0.625), // 10px (12)
  "3.5": d(0.75), // 12px (14)
  "4": d(0.8125), // 13px (16)
  "5": d(1), // 16px (20)
  "6": d(1.1875), // 19px (24)
  "7": d(1.375), // 22px (28)
  "8": d(1.5625), // 25px (32)
  "9": d(1.75), // 28px (36)
  "10": d(1.9375), // 31px (40)
  "11": d(2.125), // 34px (44)
  "12": d(2.3125), // 37px (48)
  "14": d(2.625), // 42px (56)
  "16": d(3), // 48px (64)
  "20": d(3.75), // 60px (80)
  "24": d(4.5), // 72px (96)
  "28": d(5.25), // 84px (112)
  "32": d(6), // 96px (128)
  "36": d(6.75),
  "40": d(7.5),
  "44": d(8.25),
  "48": d(9),
  "52": d(9.75),
  "56": d(10.5),
  "60": d(11.25),
  "64": d(12),
  "72": d(13.5),
  "80": d(15),
  "96": d(18),
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      padding: DENSITY,
      margin: DENSITY,
      gap: DENSITY,
      space: DENSITY,
      colors: {
        // Inside the logged-in app these follow the chosen appearance (Escuro/Claro/Automático):
        // "white" is the foreground ink and "space-*" the surfaces. Without the variables
        // (public pages) they resolve to the original dark palette.
        white: "rgb(var(--c-ink, 255 255 255) / <alpha-value>)",
        snow: "#ffffff", // always white, for text on colored or gradient backgrounds
        space: {
          bg: "rgb(var(--c-space-bg, 5 6 15) / <alpha-value>)",
          surface: "rgb(var(--c-space-surface, 11 14 28) / <alpha-value>)",
          card: "rgb(var(--c-space-card, 17 21 42) / <alpha-value>)",
          border: "rgb(var(--c-space-border, 31 37 66) / <alpha-value>)",
        },
        // Accent of the profile being viewed (Personalizar perfil → Cor do perfil).
        pa: "rgb(var(--pa, 139 92 246) / <alpha-value>)",
        // Accent of the open conversation (Messenger → Tema da conversa).
        chat: "rgb(var(--chat-accent, 139 92 246) / <alpha-value>)",
        // Inside the app these follow the member's color (Personalizar perfil → Cor do perfil);
        // without it (default color, public pages) they are the original ÓrbitaX palette.
        orbit: {
          blue: "rgb(var(--app-accent-a, 43 108 255) / <alpha-value>)",
          cyan: "#22d3ee",
          purple: "rgb(var(--app-accent, 139 92 246) / <alpha-value>)",
          pink: "rgb(var(--app-accent-b, 236 72 153) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "orbit-gradient": "linear-gradient(135deg, rgb(var(--app-accent-a, 43 108 255)) 0%, rgb(var(--app-accent, 139 92 246)) 55%, rgb(var(--app-accent-b, 236 72 153)) 100%)",
        "chat-bubble": "var(--chat-bubble, linear-gradient(135deg, rgb(var(--app-accent-a, 43 108 255)) 0%, rgb(var(--app-accent, 139 92 246)) 55%, rgb(var(--app-accent-b, 236 72 153)) 100%))",
        "orbit-radial": "radial-gradient(circle at 30% 20%, rgb(var(--app-accent, 139 92 246) / 0.25), transparent 60%)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        script: ["var(--font-caveat)", "cursive"],
      },
      boxShadow: {
        glow: "0 0 40px rgb(var(--app-accent, 139 92 246) / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
