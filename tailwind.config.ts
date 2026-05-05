// Dummy config to appease lovable-tagger / legacy Vite plugins.
// The actual project uses Tailwind v4 via CSS imports in src/styles.css.
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
