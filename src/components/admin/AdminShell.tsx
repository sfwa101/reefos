/**
 * AdminShell — WAVE UI-5 (Steel Glass Genesis).
 *
 * Apple-inspired Steel Glass shell that wraps every `/admin/*` route
 * via the layout in `src/routes/admin.tsx`. Activation is fully scoped
 * by the `.steel-glass` class on the root element, so the storefront's
 * green palette stays untouched.
 *
 * Layer stack (z-index ascending):
 *  • Root            — .steel-glass .bg-mesh .font-body
 *  • Header (top)    — sticky, glass-steel, h-16, z-50
 *  • Sidebar (lg+)   — hidden lg:block w-60, glass-steel rounded-3xl
 *  • <Outlet />      — child admin routes render here
 *  • Bottom Nav      — mobile only (lg:hidden), fixed bottom-4, z-40
 *  • Hakim FAB       — placeholder launcher, fixed bottom-left, z-50
 *
 * Constitution v5.1 — UI Purity: every clickable surface uses shadcn
 * primitives or @tanstack/react-router <Link>. No raw <button>/<input>.
 */
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, Home, Moon, Search, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { HakimLayer } from "./hakim/HakimLayer";
import { useHakimLayer } from "./hakim/useHakimLayer";
import { SovereignSwitcher } from "./SovereignSwitcher";
import { ReefModeToggle } from "./ReefModeToggle";
import { useActiveOSCompany } from "@/core/identity/useActiveOSCompany";
import { useReefMode } from "@/core/identity/useReefMode";
import { getPrimaryNav, getBottomNav, type NavItem } from "./navConfig";

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */

function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
  return { isDark, toggle: () => setIsDark((v) => !v) };
}

function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

/* ------------------------------------------------------------------ */

function AdminHeader({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  const openLayer = useHakimLayer((s) => s.open);
  return (
    <header className="sticky top-0 z-50 glass-steel border-b border-white/40 h-16">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-3 px-4 lg:px-6">
        <Link
          to="/admin"
          className="flex items-center gap-2 transition active:scale-95"
          aria-label="لوحة Salsabil"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elevated">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-[15px] font-extrabold leading-none tracking-tight">
              Salsabil OS
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sovereign Console
            </p>
          </div>
        </Link>

        <SovereignSwitcher />
        <ReefModeToggle />

        <button
          type="button"
          onClick={() => openLayer("command")}
          aria-label="افتح شريط الأوامر"
          className="relative ms-auto hidden h-10 w-full max-w-md flex-1 items-center gap-2 rounded-2xl border border-white/40 bg-white/40 px-4 text-[13px] font-medium backdrop-blur-md transition hover:bg-white/60 md:flex"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-right text-muted-foreground/80">
            بحث سريع · طلب، عميل، منتج…
          </span>
          <kbd className="rounded-md border border-white/60 bg-white/60 px-1.5 py-0.5 text-[10px] font-extrabold text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
            className="h-10 w-10 rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md hover:bg-white/50"
          >
            {isDark ? (
              <Sun className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={2.2} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="الإشعارات"
            className="relative h-10 w-10 rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md hover:bg-white/50"
          >
            <Bell className="h-4 w-4" strokeWidth={2.2} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </Button>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-2xl border border-white/40 bg-white/30 px-3 h-10 text-[12px] font-extrabold backdrop-blur-md transition hover:bg-white/50 active:scale-95 lg:inline-flex"
            aria-label="العودة للمتجر"
          >
            <Home className="h-3.5 w-3.5" strokeWidth={2.4} />
            المتجر
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function AdminSidebar({ activePath, items }: { activePath: string; items: NavItem[] }) {
  return (
    <aside className="hidden lg:block w-60 shrink-0 px-4 py-6">
      <nav className="glass-steel sticky top-24 rounded-3xl p-2.5 shadow-elevated">
        <p className="px-3 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          الإدارة
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/admin"
                ? activePath === "/admin" || activePath === "/admin/"
                : activePath === item.to || activePath.startsWith(`${item.to}/`);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-bold transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-steel-soft"
                      : "text-foreground/80 hover:bg-white/40 hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="admin-nav-dot"
                      className="h-1.5 w-1.5 rounded-full bg-primary-foreground"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

function AdminBottomNav({ activePath, items }: { activePath: string; items: NavItem[] }) {
  return (
    <nav
      className="fixed bottom-4 left-4 right-4 z-40 glass-steel-strong rounded-3xl p-1.5 shadow-elevated lg:hidden"
      aria-label="تنقل الإدارة"
    >
      <ul className="flex items-center justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/admin"
              ? activePath === "/admin" || activePath === "/admin/"
              : activePath === item.to || activePath.startsWith(`${item.to}/`);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-extrabold transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.6 : 2} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */

/** Floating Hakim launcher — opens the global Hakim side panel. */
function HakimFloatingLauncher() {
  const open = useHakimLayer((s) => s.open);
  return (
    <motion.button
      type="button"
      onClick={() => open("panel")}
      aria-label="مساعد حكيم"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.2 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="group fixed bottom-24 left-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground shadow-elevated ring-2 ring-white/60 lg:bottom-6"
    >
      <Sparkles className="h-6 w-6" strokeWidth={2.4} />
      <span className="absolute right-0.5 top-0.5 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      </span>
    </motion.button>
  );
}

/* ============================ Shell ============================ */

export function AdminShell() {
  const { isDark, toggle } = useTheme();
  const activePath = useActivePath();
  const activeOSId = useActiveOSCompany((s) => s.activeId);
  const reefMode = useReefMode((s) => s.mode);
  const primary = getPrimaryNav(activeOSId, reefMode);
  const bottom = getBottomNav(activeOSId, reefMode);

  return (
    <div className="steel-glass bg-mesh font-body min-h-screen w-full" dir="rtl">
      <AdminHeader isDark={isDark} toggleTheme={toggle} />

      <div className="mx-auto flex w-full max-w-screen-2xl">
        <AdminSidebar activePath={activePath} items={primary} />

        <main className="flex-1 min-w-0 px-3 pb-32 pt-4 lg:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <AdminBottomNav activePath={activePath} items={bottom} />
      <HakimFloatingLauncher />
      <HakimLayer />
    </div>
  );
}
