import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Globe, Bell, Accessibility, ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import BackHeader from "@/components/BackHeader";
import { useTheme, type ColorTheme } from "@/context/ThemeContext";
import { useUI } from "@/context/UIContext";
import { useTranslation } from "@/context/LocaleContext";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LOCALE_LABEL, type Locale } from "@/apps/reef-al-madina/features/settings/locales";
import { Button } from "@/components/ui/button";
import {
  MODE_OPTIONS,
  THEMES,
  THEME_GROUP_TKEYS,
  type ThemeGroupKey,
} from "@/apps/reef-al-madina/features/settings/data";

const SwatchButton = ({
  id,
  label,
  active,
  onPick,
}: {
  id: ColorTheme;
  label: string;
  active: boolean;
  onPick: (c: ColorTheme) => void;
}) => {
  // Live swatch — reads --primary from a scoped wrapper using data-theme,
  // so the dot always reflects the actual theme color (never hardcoded).
  const wrapperAttr = id === "sage" ? {} : { "data-theme": id };
  return (
    <Button
      type="button"
      onClick={() => onPick(id)}
      className="flex flex-col items-center gap-1.5"
      aria-label={label}
      aria-pressed={active}
    >
      <div {...wrapperAttr} className="w-full">
        <div
          className={`relative flex h-16 w-full items-center justify-center overflow-hidden rounded-3xl shadow-soft transition ease-apple ${
            active
              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-[0.97]"
              : "hover:-translate-y-0.5"
          }`}
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)",
          }}
        >
          {active && (
            <span className="rounded-full bg-background/90 p-1 shadow">
              <Check className="h-3.5 w-3.5 text-foreground" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-bold">{label}</span>
    </Button>
  );
};

const Settings = () => {
  const { mode, setMode, colorTheme, setColorTheme } = useTheme();
  const { viewMode, toggleSimplified } = useUI();
  const { t, locale, setLocale } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <div className="space-y-6 pb-2">
      <BackHeader title={t("settings.title")} subtitle={t("settings.subtitle")} accent={t("settings.account")} />

      {/* Mode */}
      <section>
        <h3 className="mb-2 px-1 text-[11px] font-extrabold tracking-wider text-muted-foreground">
          {t("settings.mode")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {MODE_OPTIONS.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode(m.id)}
                className={`flex flex-col items-center gap-2 rounded-3xl py-4 transition ease-apple ${
                  active
                    ? "bg-primary text-primary-foreground shadow-pill"
                    : "bg-card ring-1 ring-border/60 shadow-soft"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.4} />
                <span className="text-xs font-bold">{t(m.tKey)}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Themes — grouped */}
      {THEME_GROUP_TKEYS.map((g: { id: ThemeGroupKey; tKey: string }) => {
        const items = THEMES.filter((th) => th.group === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id}>
            <h3 className="mb-2 px-1 text-[11px] font-extrabold tracking-wider text-muted-foreground">
              {t(g.tKey)}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {items.map((th) => (
                <SwatchButton
                  key={th.id}
                  id={th.id}
                  label={t(th.tKey)}
                  active={colorTheme === th.id}
                  onPick={setColorTheme}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Accessibility */}
      <section>
        <h3 className="mb-2 px-1 text-[11px] font-extrabold tracking-wider text-muted-foreground">
          {t("settings.a11y")}
        </h3>
        <div className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 shadow-soft ring-1 ring-border/60">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Accessibility className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{t("settings.a11y.simplified")}</p>
            <p className="text-[10.5px] text-muted-foreground">{t("settings.a11y.simplified.hint")}</p>
          </div>
          <Switch checked={viewMode === "simplified"} onCheckedChange={toggleSimplified} />
        </div>
      </section>

      {/* Preferences */}
      <section>
        <h3 className="mb-2 px-1 text-[11px] font-extrabold tracking-wider text-muted-foreground">
          {t("settings.preferences")}
        </h3>
        <div className="overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-border/60 divide-y divide-border/60">
          <Button
            type="button"
            onClick={() => setLangOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-right transition active:bg-foreground/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Globe className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-sm font-bold">{t("settings.preferences.lang")}</p>
              <p className="text-[10.5px] text-muted-foreground">{LOCALE_LABEL[locale]}</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Link
            to="/account/notifications"
            className="flex w-full items-center gap-3 px-4 py-3 text-right transition active:bg-foreground/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Bell className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{t("settings.preferences.notifications")}</p>
              <p className="text-[10.5px] text-muted-foreground">{t("settings.preferences.notifications.sub")}</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      <Sheet open={langOpen} onOpenChange={setLangOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("settings.lang.sheet.title")}</SheetTitle>
            <SheetDescription>{t("settings.lang.sheet.hint")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-2">
            {(Object.keys(LOCALE_LABEL) as Locale[]).map((l) => {
              const active = locale === l;
              return (
                <Button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLocale(l);
                    setLangOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-card ring-1 ring-border/60"
                  }`}
                >
                  <span>{LOCALE_LABEL[l]}</span>
                  {active && <Check className="h-4 w-4" strokeWidth={3} />}
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Settings;
