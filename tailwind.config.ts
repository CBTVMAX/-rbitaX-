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
        orbit: {
          blue: "#2b6cff",
          cyan: "#22d3ee",
          purple: "#8b5cf6",
          pink: "#ec4899",
        },
      },
      backgroundImage: {
        "orbit-gradient": "linear-gradient(135deg, #2b6cff 0%, #8b5cf6 55%, #ec4899 100%)",
        "chat-bubble": "var(--chat-bubble, linear-gradient(135deg, #2b6cff 0%, #8b5cf6 55%, #ec4899 100%))",
        "orbit-radial": "radial-gradient(circle at 30% 20%, rgba(139,92,246,0.25), transparent 60%)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        script: ["var(--font-caveat)", "cursive"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(139,92,246,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
