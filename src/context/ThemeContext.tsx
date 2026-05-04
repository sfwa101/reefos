import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ColorTheme =
  | "sage"
  | "ocean"
  | "amber"
  | "midnight"
  | "blush"
  | "lavender"
  | "mint"
  | "peach"
  | "plum"
  | "navy";
export type Mode = "light" | "dark" | "system";

type ThemeCtx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  resolvedMode: "light" | "dark";
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

// Read what the pre-hydration ScriptOnce already applied to <html>, so React
// state matches the DOM on first render and we never re-flash to defaults.
const readInitialMode = (): Mode => {
  if (typeof window === "undefined") return "light";
  try {
    return (localStorage.getItem("reef-mode") as Mode | null) ?? "light";
  } catch {
    return "light";
  }
};
const readInitialColor = (): ColorTheme => {
  if (typeof window === "undefined") return "sage";
  try {
    return (localStorage.getItem("reef-color") as ColorTheme | null) ?? "sage";
  } catch {
    return "sage";
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // STRICT: First app launch is ALWAYS light + sage — never auto-pick system dark.
  const [mode, setModeState] = useState<Mode>(readInitialMode);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(readInitialColor);
  const [systemMode, setSystemMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Persist defaults explicitly the first time so we never re-evaluate system pref.
    if (!localStorage.getItem("reef-mode")) localStorage.setItem("reef-mode", "light");
    if (!localStorage.getItem("reef-color")) localStorage.setItem("reef-color", "sage");

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemMode(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedMode = mode === "system" ? systemMode : mode;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedMode === "dark");
    if (colorTheme === "sage") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", colorTheme);
  }, [resolvedMode, colorTheme]);

  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem("reef-mode", m);
  };
  const setColorTheme = (c: ColorTheme) => {
    setColorThemeState(c);
    localStorage.setItem("reef-color", c);
  };

  return (
    <Ctx.Provider value={{ mode, setMode, resolvedMode, colorTheme, setColorTheme }}>
      {children}
    </Ctx.Provider>
  );
};

export const useTheme = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
};