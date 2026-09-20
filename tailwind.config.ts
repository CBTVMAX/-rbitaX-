import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          bg: "#05060f",
          surface: "#0b0e1c",
          card: "#11152a",
          border: "#1f2542",
        },
        orbit: {
          blue: "#2b6cff",
          cyan: "#22d3ee",
          purple: "#8b5cf6",
          pink: "#ec4899",
        },
      },
      backgroundImage: {
        "orbit-gradient": "linear-gradient(135deg, #2b6cff 0%, #8b5cf6 55%, #ec4899 100%)",
        "orbit-radial": "radial-gradient(circle at 30% 20%, rgba(139,92,246,0.25), transparent 60%)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(139,92,246,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
