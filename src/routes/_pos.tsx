/**
 * Phase 53 — Sovereign POS Workspace Layout
 *
 * High-density operator shell (Law 4 — Cognitive UI). RTL.
 * Permanent top-bar: Active Shift • Cashier • Network/Sync queue.
 * Minimal icon sidebar: Sales • Inventory • Returns • Close Shift.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { offlineQueueSize, processQueue } from "@/lib/offlineSyncQueue";
import { ScanLine, Boxes, Undo2, LockKeyhole, Wifi, WifiOff, CloudUpload } from "lucide-react";

export const Route = createFileRoute("/_pos")({
  component: PosLayout,
});

const NAV = [
  { to: "/pos",              label: "بيع",           icon: ScanLine },
  { to: "/pos/inventory",    label: "المخزون",       icon: Boxes },
  { to: "/pos/returns",      label: "مرتجعات",       icon: Undo2 },
  { to: "/pos/close-shift",  label: "إغلاق ورديّة",  icon: LockKeyhole },
];

function PosLayout() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const on = () => { setOnline(true); processQueue().then(refresh); };
    const off = () => setOnline(false);
    const refresh = () => offlineQueueSize().then(setQueueSize).catch(() => {});
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    refresh();
    const t = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.clearInterval(t);
    };
  }, []);

  const cashierName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ??
    (user?.user_metadata as { name?: string } | undefined)?.name ??
    user?.email ??
    "غير معروف";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar — icon-only, dense */}
      <aside className="w-14 shrink-0 border-l border-border/40 bg-surface/95 flex flex-col items-center py-3 gap-1 sticky top-0 h-screen">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/pos" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground-secondary hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar — operator HUD */}
        <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-border/40">
          <div className="h-11 px-3 flex items-center gap-4 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground-secondary">الورديّة:</span>
              <span className="font-mono text-success">نشطة</span>
            </div>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-1.5">
              <span className="text-foreground-secondary">الكاشير:</span>
              <span className="font-medium truncate max-w-[200px]">{cashierName}</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              {online ? (
                <span className="flex items-center gap-1 text-success"><Wifi className="h-3.5 w-3.5" /> متصل</span>
              ) : (
                <span className="flex items-center gap-1 text-warning"><WifiOff className="h-3.5 w-3.5" /> بدون اتصال</span>
              )}
            </div>
            {queueSize > 0 && (
              <div className="flex items-center gap-1 text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                <CloudUpload className="h-3.5 w-3.5" />
                <span className="font-mono">{queueSize}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
