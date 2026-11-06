import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f5fa", 100: "#dde6f1", 200: "#b9cbe2", 300: "#8aa8cc", 400: "#5a82b0",
          500: "#3a6595", 600: "#2b4f78", 700: "#1f3d5f", 800: "#16304e", 900: "#0b2a4a", 950: "#071a2f",
        },
        brand: {
          50: "#ecfdf3", 100: "#d1fae0", 200: "#a7f3c4", 300: "#6ee79f", 400: "#34d27a",
          500: "#16a34a", 600: "#15803d", 700: "#166534", 800: "#14532d", 900: "#0f3d22",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans Bengali"', "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.2rem" },
    },
  },
  plugins: [animate],
};
export default config;
