import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  | "navy"
  | "apple-glass";
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
    // Persist to profile so the Emperor's choice survives across sessions/devices.
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        await supabase.from("profiles").update({ theme_preference: c }).eq("id", uid);
      } catch {
        /* non-blocking */
      }
    })();
  };

  const value = useMemo<ThemeCtx>(
    () => ({ mode, setMode, resolvedMode, colorTheme, setColorTheme }),
    [mode, resolvedMode, colorTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTheme = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
};