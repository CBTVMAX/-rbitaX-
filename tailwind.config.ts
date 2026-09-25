import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
