import type { Config } from "tailwindcss";

// Theme-aware colours are CSS variables (RGB channels) set in globals.css for
// light and .dark, so components use one class (bg-surface, text-ink) and
// never need a dark: variant for the basics.
const themed = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          500: "#2f7cf6",
          600: "#1f63db",
          700: "#1a4fb1",
          900: "#14305f",
        },
        canvas: themed("canvas"),
        surface: themed("surface"),
        subtle: themed("subtle"),
        line: { DEFAULT: themed("line"), strong: themed("line-strong") },
        ink: themed("ink"),
        body: themed("body"),
        muted: themed("muted"),
        faint: themed("faint"),
        accent: { DEFAULT: themed("accent"), soft: themed("accent-soft") },
      },
    },
  },
  plugins: [],
};

export default config;
