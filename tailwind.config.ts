import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
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
      },
    },
  },
  plugins: [],
};

export default config;
