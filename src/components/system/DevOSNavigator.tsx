/**
 * DevOSNavigator — Phase VIII-Dev floating OS dock.
 * -------------------------------------------------
 * A development-only navigator that surfaces every Mini-App registered
 * in the Salsabil OS app registry as a glassmorphic bottom dock.
 *
 * - Lists apps via `appRegistry` (zero hardcoding).
 * - Highlights the cognitive hub (Khalil) with a soft pulse halo.
 * - Provides a "Set Khalil as Default" toggle that redirects `/` → `/khalil`.
 * - Renders ONLY in dev (`import.meta.env.DEV`); strip-friendly in prod.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Brain, ChevronUp, ChevronDown } from "lucide-react";
import { appRegistry } from "@/core-os/app-registry";

const STORAGE_KEY = "salsabil.dev.khalilAsDefault";

export const DevOSNavigator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [khalilDefault, setKhalilDefault] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  // Persist + apply Khalil-as-default redirect from `/`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, khalilDefault ? "1" : "0");
  }, [khalilDefault]);

  useEffect(() => {
    if (!khalilDefault) return;
    if (location.pathname === "/") {
      navigate({ to: "/khalil", replace: true });
    }
  }, [khalilDefault, location.pathname, navigate]);

  const apps = appRegistry.list({ userId: null });

  return (
    <div
      dir="rtl"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-3"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {/* Collapse handle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          Salsabil OS · Dev
        </button>

        {open && (
          <div className="flex items-center gap-2 rounded-3xl border border-white/20 bg-black/40 p-2 shadow-2xl backdrop-blur-md">
            {/* Khalil-as-default toggle */}
            <label className="flex items-center gap-1.5 rounded-2xl bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white">
              <input
                type="checkbox"
                checked={khalilDefault}
                onChange={(e) => setKhalilDefault(e.target.checked)}
                className="h-3 w-3 accent-amber-400"
              />
              <Brain className="h-3 w-3 text-amber-300" />
              Khalil =
              <span className="opacity-80">Default</span>
            </label>

            <span className="h-8 w-px bg-white/15" />

            {/* App tiles */}
            <div className="flex items-center gap-1.5">
              {apps.map((app) => {
                const Icon = app.icon;
                const isKhalilHub = app.id === "khalil-store";
                const active =
                  app.route === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(app.route);

                return (
                  <Link
                    key={app.id}
                    to={app.route}
                    className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br ${app.accent} shadow-md transition active:scale-95 ${
                      active ? "ring-2 ring-white/80" : ""
                    }`}
                    title={app.name}
                  >
                    <Icon className="h-5 w-5 text-white drop-shadow" />
                  </Link>
                );
              })}

              {/* Khalil cognitive hub — distinct, pulses */}
              <Link
                to="/khalil"
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg transition active:scale-95"
                title="Khalil — Cognitive Hub"
              >
                <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-300/40" />
                <Brain className="relative h-5 w-5 text-white drop-shadow" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevOSNavigator;
