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
        neon: {
          pink: "#ff2bd6",
          cyan: "#22d3ee",
          purple: "#a855f7",
          green: "#22ff88",
          red: "#ff5577",
          amber: "#ffb020",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      boxShadow: {
        "neon-cyan": "0 0 12px rgba(34,211,238,0.55), 0 0 32px rgba(34,211,238,0.18)",
        "neon-pink": "0 0 12px rgba(255,43,214,0.55), 0 0 32px rgba(255,43,214,0.18)",
        "neon-green": "0 0 12px rgba(34,255,136,0.55), 0 0 28px rgba(34,255,136,0.18)",
        "neon-red": "0 0 12px rgba(255,85,119,0.55), 0 0 28px rgba(255,85,119,0.18)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.6)", opacity: "0.9" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%,100%": { opacity: "1" },
          "47%": { opacity: "1" },
          "48%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        ticker: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.22,1,0.36,1) infinite",
        scanline: "scanline 6s linear infinite",
        flicker: "flicker 4s infinite",
        ticker: "ticker 240ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
