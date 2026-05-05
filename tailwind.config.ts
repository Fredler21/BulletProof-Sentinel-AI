import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: "#0a0f1c",
          panel: "#0f1626",
          border: "#1f2a44",
          accent: "#22d3ee",
          danger: "#f43f5e",
          warn: "#f59e0b",
          ok: "#10b981",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
