import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-deep": "var(--color-bg-deep)",
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-hover": "var(--color-surface-hover)",
        accent: "#ff6b4a",
        "accent-soft": "#ff8a70",
        success: "#4ade80",
        warning: "#fbbf24",
        danger: "#ef4444",
        text: "var(--color-text)",
        "text-secondary": "var(--color-text-secondary)",
        "text-dim": "var(--color-text-dim)",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.1)" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOutScale: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" },
        },
        toastIn: {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        toastOut: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-12px)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        breathe: "breathe 3s ease-in-out infinite",
        pulseRing: "pulseRing 1.5s ease-out infinite",
        spin: "spin 1s linear infinite",
        fadeIn: "fadeIn 0.3s ease forwards",
        fadeOutScale: "fadeOutScale 0.3s ease forwards",
        slideUp: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        slideDown: "slideDown 0.3s ease forwards",
        toastIn: "toastIn 0.3s ease forwards",
        toastOut: "toastOut 0.3s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
