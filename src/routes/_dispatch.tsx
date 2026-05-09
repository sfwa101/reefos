/**
 * Phase 56 — Dispatch Workspace Layout.
 *
 * Operator shell for the handover station (driver pickup + walk-in customer
 * collection). Token-pure dark UI mirroring the KDS DNA. RTL.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PackageCheck, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/_dispatch")({
  component: DispatchLayout,
});

function DispatchLayout() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

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

  return (
    <div dir="rtl" className="dark min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="h-12 px-4 flex items-center gap-4 text-[12.5px]">
          <div className="flex items-center gap-2 font-display font-extrabold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <PackageCheck className="h-4 w-4" />
            </span>
            <span className="text-foreground">Dispatch Station</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground font-normal">جاهز للتسليم</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            {online ? (
              <span className="flex items-center gap-1 text-primary"><Wifi className="h-3.5 w-3.5" /> متصل</span>
            ) : (
              <span className="flex items-center gap-1 text-destructive"><WifiOff className="h-3.5 w-3.5" /> منفصل</span>
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
