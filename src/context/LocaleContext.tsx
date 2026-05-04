import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { DICTIONARIES, LOCALE_DIR, type Locale } from "@/features/settings/locales";

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const Ctx = createContext<LocaleCtx | null>(null);

const readInitial = (): Locale => {
  if (typeof window === "undefined") return "ar";
  try {
    return ((localStorage.getItem("reef-locale") as Locale | null) ?? "ar");
  } catch {
    return "ar";
  }
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(readInitial);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("lang", locale);
    root.setAttribute("dir", LOCALE_DIR[locale]);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("reef-locale", l); } catch { /* noop */ }
  }, []);

  const t = useCallback(
    (key: string) => DICTIONARIES[locale][key] ?? DICTIONARIES.ar[key] ?? key,
    [locale],
  );

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
};

export const useTranslation = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTranslation must be used within LocaleProvider");
  return v;
};
