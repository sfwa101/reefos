// Dummy config to appease lovable-tagger / legacy Vite plugins.
// The actual project uses Tailwind v4 via CSS imports in src/styles.css.
// Tayseer sovereign tokens are mirrored here for any legacy tooling;
// the source of truth lives in `src/styles.css` @theme block.
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // WAVE UI-4 — Steel Glass typography stack.
        display: ["Outfit", "Tajawal", "system-ui", "sans-serif"],
        body: ["Figtree", "Tajawal", "system-ui", "sans-serif"],
        arabic: ["Tajawal", "Cairo", "system-ui", "sans-serif"],
      },
      colors: {
        tayseer: {
          night: "#0A0F1A",
          surface: "#111827",
          gold: "#C9A84C",
          green: "#1A6B4A",
          cream: "#F8F6F0",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
