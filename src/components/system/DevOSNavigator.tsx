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
import { appRegistry } from "@/core-os/app-registry";

const STORAGE_KEY = "salsabil.dev.khalilAsDefault";
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
  const [khalilDefault, setKhalilDefault] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [godMode, setGodMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(GOD_MODE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, khalilDefault ? "1" : "0");
  }, [khalilDefault]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GOD_MODE_KEY, godMode ? "1" : "0");
    const w = window as unknown as { __SALSABIL_GOD_MODE__?: boolean; SALSABIL_GOD_MODE?: boolean };
    w.__SALSABIL_GOD_MODE__ = godMode;
    w.SALSABIL_GOD_MODE = godMode;
  }, [godMode]);

  useEffect(() => {
    if (!khalilDefault) return;
    if (location.pathname === "/") {
      navigate({ to: "/khalil", replace: true });
    }
  }, [khalilDefault, location.pathname, navigate]);

  // Close nexus when capsule collapses.
  useEffect(() => {
    if (!open) setNexusOpen(false);
  }, [open]);

  const apps = appRegistry.list({ userId: null });

  return (
    <div
      dir="ltr"
      className="pointer-events-none fixed z-[60]"
      style={{
        left: "max(16px, env(safe-area-inset-left))",
        bottom: "calc(80px + env(safe-area-inset-bottom))",
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
              className="absolute bottom-16 left-0 flex w-56 flex-col items-stretch gap-2 rounded-[28px] border border-white/15 bg-black/50 p-2.5 shadow-2xl backdrop-blur-xl"
            >
              {/* Khalil cognitive hub — top, pulsing */}
              <Link
                to="/khalil"
                onClick={() => setOpen(false)}
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-400 to-orange-600 shadow-md transition active:scale-95"
                title="Khalil — Cognitive Hub"
              >
                <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-300/40" />
                <Brain className="relative h-4 w-4 text-white drop-shadow" />
              </Link>

              <span className="h-px w-8 bg-white/15" />

              {/* App tiles */}
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
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br ${app.accent} shadow transition active:scale-95 ${
                        active ? "ring-2 ring-white/80" : ""
                      }`}
                      title={app.name}
                    >
                      <Icon className="h-4 w-4 text-white drop-shadow" />
                    </Link>
                  </motion.div>
                );
              })}

              <span className="h-px w-8 bg-white/15" />

              {/* Admin Nexus trigger */}
              <button
                onClick={() => setNexusOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-slate-700 to-slate-900 shadow transition hover:from-slate-600 active:scale-95"
                title="Admin Nexus"
              >
                <Shield className="h-4 w-4 text-white drop-shadow" />
              </button>

              {/* Khalil-as-default toggle */}
              <label
                className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl bg-white/5 px-1.5 py-1.5 text-[8px] font-bold text-white/90"
                title="Set Khalil as Default Home"
              >
                <Sparkles className="h-3 w-3 text-amber-300" />
                <input
                  type="checkbox"
                  checked={khalilDefault}
                  onChange={(e) => setKhalilDefault(e.target.checked)}
                  className="h-3 w-3 accent-amber-400"
                />
              </label>

              {/* Absolute Manager Mode (God Mode) toggle */}
              <label
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-1.5 py-1.5 text-[8px] font-bold text-white/90 transition ${
                  godMode ? "bg-gradient-to-br from-amber-500/40 to-rose-500/40 ring-1 ring-amber-300/60" : "bg-white/5"
                }`}
                title="Absolute Manager Mode — bypass RBAC UI guards"
              >
                <Crown className={`h-3 w-3 ${godMode ? "text-amber-200" : "text-white/70"}`} />
                <input
                  type="checkbox"
                  checked={godMode}
                  onChange={(e) => setGodMode(e.target.checked)}
                  className="h-3 w-3 accent-amber-400"
                />
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
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-black shadow-2xl ring-1 ring-amber-400/30 backdrop-blur-md"
          aria-label="Salsabil Dev Node"
        >
          {open ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Brain className="h-5 w-5 text-amber-300" />
          )}
          {!open && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
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
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                key="nexus"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-1/2 top-1/2 w-[88vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 to-black/95 p-5 shadow-2xl backdrop-blur-xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNexusOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight text-white">
                        Admin Nexus
                      </h3>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
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
                        className={`group flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-br ${link.accent} p-4 shadow-lg transition active:scale-95`}
                      >
                        <Icon className="h-6 w-6 text-white drop-shadow" />
                        <div>
                          <div className="text-[13px] font-extrabold text-white">
                            {link.label}
                          </div>
                          <div className="font-mono text-[10px] text-white/70">
                            {link.to}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <p className="mt-4 text-center text-[10px] font-medium text-white/40">
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
