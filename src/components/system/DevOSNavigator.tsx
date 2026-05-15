/**
 * DevOSNavigator — "Salsabil Dev-Node" (Phase VIII-Dev v2)
 * --------------------------------------------------------
 * A single circular FAB anchored bottom-left. On tap it expands into a
 * vertical blurred capsule containing:
 *   • Mini-App switcher (driven by `appRegistry`)
 *   • Admin Nexus overlay → /admin, /driver, /vendor, /pos
 *   • "Khalil = Default" persistence toggle
 *
 * Dev-only (`import.meta.env.DEV`). Tree-shaken from production builds.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Shield,
  X,
  Sparkles,
  Truck,
  Store,
  ScanLine,
  ShieldCheck,
  ChevronLeft,
  Wand2,
  Crown,
} from "lucide-react";
import { appRegistry } from "@/core/capabilities/app-registry";

const STORAGE_KEY = "salsabil.dev.maeenAsDefault";
const LEGACY_STORAGE_KEYS = [
  "salsabil.dev.khalilAsDefault",
  "salsabil.dev.diwanAsDefault",
];
const GOD_MODE_KEY = "salsabil.dev.godMode";

type NexusLink = {
  label: string;
  to: string;
  icon: typeof Shield;
  accent: string;
};

const NEXUS_LINKS: NexusLink[] = [
  { label: "Master Admin", to: "/admin", icon: ShieldCheck, accent: "from-violet-500 to-fuchsia-600" },
  { label: "System Editor", to: "/admin/design", icon: Wand2, accent: "from-pink-500 to-rose-600" },
  { label: "Driver Hub", to: "/driver", icon: Truck, accent: "from-sky-500 to-cyan-600" },
  { label: "Vendor Portal", to: "/vendor", icon: Store, accent: "from-emerald-500 to-teal-600" },
  { label: "POS Terminal", to: "/pos", icon: ScanLine, accent: "from-amber-500 to-orange-600" },
];

export const DevOSNavigator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [nexusOpen, setNexusOpen] = useState(false);
  const [maeenDefault, setMaeenDefault] = useState<boolean>(() => {
    if (!import.meta.env.DEV) return false;
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return true;
    // One-shot migration from legacy "khalil"/"diwan" keys.
    const migrated = LEGACY_STORAGE_KEYS.some(
      (k) => window.localStorage.getItem(k) === "1",
    );
    if (migrated) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      LEGACY_STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));
    }
    return migrated;
  });
  const [godMode, setGodMode] = useState<boolean>(() => {
    if (!import.meta.env.DEV) return false;
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(GOD_MODE_KEY) === "1";
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, maeenDefault ? "1" : "0");
  }, [maeenDefault]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GOD_MODE_KEY, godMode ? "1" : "0");
    const w = window as unknown as { __SALSABIL_GOD_MODE__?: boolean; SALSABIL_GOD_MODE?: boolean };
    w.__SALSABIL_GOD_MODE__ = godMode;
    w.SALSABIL_GOD_MODE = godMode;
  }, [godMode]);

  useEffect(() => {
    if (!maeenDefault) return;
    if (location.pathname === "/") {
      navigate({ to: "/maeen", replace: true });
    }
  }, [maeenDefault, location.pathname, navigate]);

  // Close nexus when capsule collapses.
  useEffect(() => {
    if (!open) setNexusOpen(false);
  }, [open]);

  const apps = appRegistry.list({ userId: null });

  return (
    <div
      dir="ltr"
      className="pointer-events-none fixed z-[80]"
      style={{
        left: "max(16px, env(safe-area-inset-left))",
        bottom: "calc(120px + env(safe-area-inset-bottom))",
      }}
    >
      <div className="pointer-events-auto relative">
        {/* Expanded Capsule */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="capsule"
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="absolute bottom-16 left-0 flex w-56 flex-col items-stretch gap-2 rounded-[28px] border border-primary-foreground/15 bg-card-elevated/50 p-2.5 shadow-2xl backdrop-blur-xl"
            >
              {/* Maeen sovereign hub — top, pulsing */}
              <Link
                to="/maeen"
                onClick={() => setOpen(false)}
                className="relative flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-400 to-orange-600 px-3 shadow-md transition active:scale-95"
                title="معين — Unified Empire Gateway"
              >
                <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-300/30" />
                <Brain className="relative h-4 w-4 text-primary-foreground drop-shadow" />
                <span className="relative text-[11px] font-extrabold tracking-wide text-primary-foreground drop-shadow">
                  معين · Sovereign Hub
                </span>
              </Link>

              <span className="h-px w-full bg-primary-foreground/15" />

              {/* App tiles — horizontal row */}
              <div className="flex flex-wrap items-center justify-start gap-1.5">
                {apps.map((app, i) => {
                  const Icon = app.icon;
                  const active =
                    app.route === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(app.route);
                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * i }}
                    >
                      <Link
                        to={app.route}
                        onClick={() => setOpen(false)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-primary-foreground/15 bg-gradient-to-br ${app.accent} shadow transition active:scale-95 ${
                          active ? "ring-2 ring-primary-foreground/80" : ""
                        }`}
                        title={app.name}
                      >
                        <Icon className="h-4 w-4 text-primary-foreground drop-shadow" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              <span className="h-px w-full bg-primary-foreground/15" />

              {/* Admin Nexus trigger */}
              <button
                onClick={() => setNexusOpen(true)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-primary-foreground/15 bg-gradient-to-br from-slate-700 to-slate-900 px-3 shadow transition hover:from-slate-600 active:scale-95"
                title="Admin Nexus"
              >
                <Shield className="h-4 w-4 text-primary-foreground drop-shadow" />
                <span className="text-[11px] font-bold text-primary-foreground">Admin Nexus</span>
              </button>

              {/* Maeen-as-default toggle */}
              <label
                className="flex cursor-pointer items-center gap-2 rounded-2xl bg-primary-foreground/5 px-3 py-2 text-[11px] font-bold text-primary-foreground"
                title="Set Maeen as Default Home"
              >
                <input
                  type="checkbox"
                  checked={maeenDefault}
                  onChange={(e) => setMaeenDefault(e.target.checked)}
                  className="h-4 w-4 accent-amber-400"
                />
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="leading-tight">Maeen as Default (Home)</span>
              </label>

              {/* Absolute Manager Mode (God Mode) toggle */}
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-bold text-primary-foreground transition ${
                  godMode ? "bg-gradient-to-br from-amber-500/40 to-rose-500/40 ring-1 ring-amber-300/60" : "bg-primary-foreground/5"
                }`}
                title="Absolute Manager Mode — bypass RBAC UI guards"
              >
                <input
                  type="checkbox"
                  checked={godMode}
                  onChange={(e) => setGodMode(e.target.checked)}
                  className="h-4 w-4 accent-amber-400"
                />
                <Crown className={`h-3.5 w-3.5 ${godMode ? "text-amber-200" : "text-primary-foreground/70"}`} />
                <span className="leading-tight">God Mode (Bypass RBAC)</span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The FAB */}
        <motion.button
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className={`relative flex h-12 w-12 items-center justify-center rounded-full border border-primary-foreground/20 bg-gradient-to-br shadow-2xl backdrop-blur-md ${
            godMode
              ? "from-amber-600 via-rose-700 to-amber-900 ring-2 ring-amber-300/80"
              : "from-slate-900 via-slate-800 to-card-elevated ring-1 ring-amber-400/30"
          }`}
          aria-label="Salsabil Dev Node"
        >
          {open ? (
            <X className="h-5 w-5 text-primary-foreground" />
          ) : godMode ? (
            <Crown className="h-5 w-5 text-amber-200 drop-shadow" />
          ) : (
            <Brain className="h-5 w-5 text-amber-300" />
          )}
          {!open && (
            <span
              className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.9)] ${
                godMode
                  ? "animate-ping bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.95)]"
                  : "bg-emerald-400"
              }`}
            />
          )}
          {godMode && !open && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(252,211,77,0.95)]" />
          )}
        </motion.button>

        {/* Admin Nexus Overlay */}
        <AnimatePresence>
          {nexusOpen && (
            <motion.div
              key="nexus-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNexusOpen(false)}
              className="fixed inset-0 z-[70] bg-card-elevated/50 backdrop-blur-sm"
            >
              <motion.div
                key="nexus"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-1/2 top-1/2 w-[88vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-primary-foreground/15 bg-gradient-to-br from-slate-900/95 to-card-elevated/95 p-5 shadow-2xl backdrop-blur-xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNexusOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight text-primary-foreground">
                        Admin Nexus
                      </h3>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-primary-foreground/50">
                        Salsabil OS · Internal Portals
                      </p>
                    </div>
                  </div>
                  <Shield className="h-5 w-5 text-amber-300" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {NEXUS_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => {
                          setNexusOpen(false);
                          setOpen(false);
                        }}
                        className={`group flex flex-col items-start gap-3 rounded-2xl border border-primary-foreground/10 bg-gradient-to-br ${link.accent} p-4 shadow-lg transition active:scale-95`}
                      >
                        <Icon className="h-6 w-6 text-primary-foreground drop-shadow" />
                        <div>
                          <div className="text-[13px] font-extrabold text-primary-foreground">
                            {link.label}
                          </div>
                          <div className="font-mono text-[10px] text-primary-foreground/70">
                            {link.to}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <p className="mt-4 text-center text-[10px] font-medium text-primary-foreground/40">
                  Development build · routes are live
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DevOSNavigator;
