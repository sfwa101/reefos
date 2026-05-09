/**
 * Phase 55 — Kitchen Display System (KDS) Layout.
 *
 * Operator shell tailored for kitchen screens — high-contrast, dense,
 * always-on. RTL. Top-bar exposes the active station, network status,
 * and the live count of pending/in-prep tickets. Mirrors the `_pos`
 * layout DNA but tuned for an always-on wall display.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChefHat, Wifi, WifiOff, Flame } from "lucide-react";
import { useKdsEngine } from "@/apps/reef-al-madina/features/kds/hooks/useKdsEngine";

export const Route = createFileRoute("/_kds")({
  component: KdsLayout,
});

function KdsLayout() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const { tickets } = useKdsEngine();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const counts = useMemo(() => {
    let pending = 0, preparing = 0, ready = 0;
    for (const t of tickets) {
      if (t.prep.status === "preparing") preparing++;
      else if (t.prep.status === "ready") ready++;
      else pending++;
    }
    return { pending, preparing, ready };
  }, [tickets]);

  // Station label is informational for now; hooked up to user_roles.branch_id later.
  const stationLabel = "محطة التجهيز · الرئيسية";

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
        <div className="h-12 px-4 flex items-center gap-4 text-[12.5px]">
          <div className="flex items-center gap-2 font-display font-extrabold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <ChefHat className="h-4 w-4" />
            </span>
            <span className="text-zinc-100">KDS</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-300 font-normal">{stationLabel}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-[11.5px]">
            <Stat label="بانتظار" value={counts.pending} tone="muted" />
            <Stat label="قيد التجهيز" value={counts.preparing} tone="warn" />
            <Stat label="جاهز" value={counts.ready} tone="ok" />
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            {online ? (
              <span className="flex items-center gap-1 text-emerald-400"><Wifi className="h-3.5 w-3.5" /> متصل</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400"><WifiOff className="h-3.5 w-3.5" /> منفصل</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "muted" }) {
  const cls =
    tone === "ok" ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
    : tone === "warn" ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
    : "bg-zinc-800 text-zinc-300 ring-zinc-700";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ring-1 ${cls}`}>
      {tone === "warn" && <Flame className="h-3 w-3" />}
      <span className="font-mono tabular-nums font-bold">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}
