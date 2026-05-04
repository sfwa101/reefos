import { Sun, Moon, Monitor, type LucideIcon } from "lucide-react";
import type { ColorTheme, Mode } from "@/context/ThemeContext";

export type ModeOption = { id: Mode; icon: LucideIcon; tKey: string };

export const MODE_OPTIONS: ModeOption[] = [
  { id: "light", icon: Sun, tKey: "settings.mode.light" },
  { id: "dark", icon: Moon, tKey: "settings.mode.dark" },
  { id: "system", icon: Monitor, tKey: "settings.mode.system" },
];

export type ThemeGroupKey = "natural" | "cute" | "premium" | "apple";

export type ThemeMeta = {
  id: ColorTheme;
  tKey: string;
  group: ThemeGroupKey;
};

export const THEMES: ThemeMeta[] = [
  // Natural
  { id: "sage", tKey: "themes.sage", group: "natural" },
  { id: "ocean", tKey: "themes.ocean", group: "natural" },
  { id: "amber", tKey: "themes.amber", group: "natural" },
  { id: "midnight", tKey: "themes.midnight", group: "natural" },
  // Cute
  { id: "blush", tKey: "themes.blush", group: "cute" },
  { id: "lavender", tKey: "themes.lavender", group: "cute" },
  { id: "mint", tKey: "themes.mint", group: "cute" },
  { id: "peach", tKey: "themes.peach", group: "cute" },
  // Premium
  { id: "plum", tKey: "themes.plum", group: "premium" },
  { id: "navy", tKey: "themes.navy", group: "premium" },
  // Apple Glass
  { id: "apple", tKey: "themes.apple", group: "apple" },
  { id: "graphite", tKey: "themes.graphite", group: "apple" },
];

export const THEME_GROUP_TKEYS: { id: ThemeGroupKey; tKey: string }[] = [
  { id: "natural", tKey: "settings.themes.natural" },
  { id: "cute", tKey: "settings.themes.cute" },
  { id: "premium", tKey: "settings.themes.premium" },
  { id: "apple", tKey: "settings.themes.apple" },
];
