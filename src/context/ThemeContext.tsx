import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";

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
  const [mode, setModeState] = useState<Mode>(readInitialMode);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(readInitialColor);
  const [systemMode, setSystemMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!localStorage.getItem("reef-mode")) localStorage.setItem("reef-mode", "light");
    if (!localStorage.getItem("reef-color")) localStorage.setItem("reef-color", "sage");

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemMode(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await IdentityGateway.getCurrentUserId();
        if (!uid || cancelled) return;
        const remote = await IdentityGateway.getThemePreference(uid);
        if (cancelled || !remote) return;
        if (remote !== colorTheme) {
          setColorThemeState(remote as ColorTheme);
          localStorage.setItem("reef-color", remote);
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    void (async () => {
      try {
        const uid = await IdentityGateway.getCurrentUserId();
        if (!uid) return;
        await IdentityGateway.setThemePreference(uid, c);
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
