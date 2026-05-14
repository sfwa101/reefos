/**
 * Phase 58 — Barq Driver Operator Shell.
 *
 * Token-pure (Law 4) high-contrast operator workspace mirroring the KDS /
 * Dispatch DNA. RTL. Top-bar shows "Barq Fleet · Online/Offline", a radar
 * pulse pip when there are pending dispatch offers, and the driver's name.
 * Bottom-nav exposes Radar, Active Tasks, Earnings.
 */
import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Bike, Radar, ListChecks, Wallet, Wifi, WifiOff } from "lucide-react";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { RoleGuard } from "@/components/admin/RoleGuard";
import { useDispatchRadar } from "@/apps/reef-al-madina/features/driver/hooks/useDispatchRadar";
import { IncomingOfferModal } from "@/apps/reef-al-madina/features/driver/components/IncomingOfferModal";

export const Route = createFileRoute("/_barq")({
  component: DriverLayout,
});

function DriverLayout() {
  return (
    <RoleGuard roles={["delivery", "admin"]}>
      <DriverShellInner />
    </RoleGuard>
  );
}

function DriverShellInner() {
  const { pathname } = useLocation();
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [name, setName] = useState<string | null>(null);
  const { offers } = useDispatchRadar();
  const pendingOffers = offers.length;

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled) setName((prof?.full_name as string | undefined) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useMemo(
    () =>
      [
        { to: "/driver-ops", icon: ListChecks, label: "طلباتي", exact: true as boolean },
        { to: "/driver/map", icon: Radar, label: "الخريطة", exact: false as boolean },
        { to: "/driver/wallet", icon: Wallet, label: "العهدة", exact: false as boolean },
      ] as const,
    [],
  );

  return (
    <div
      dir="rtl"
      className="dark min-h-screen bg-background text-foreground flex flex-col"
    >
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="h-12 px-4 flex items-center gap-3 text-[12.5px]">
          <div className="flex items-center gap-2 font-display font-extrabold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bike className="h-4 w-4" />
            </span>
            <span className="text-foreground">Barq Fleet</span>
            {name && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground font-normal">{name}</span>
              </>
            )}
          </div>
          <div className="flex-1" />
          {pendingOffers > 0 && (
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary ring-1 ring-primary/30 px-2.5 py-0.5 text-[11.5px]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-mono tabular-nums font-bold">
                {pendingOffers}
              </span>
              <span className="opacity-80">عرض جديد</span>
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {online ? (
              <span className="flex items-center gap-1 text-emerald-500">
                <Wifi className="h-3.5 w-3.5" /> متصل
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500">
                <WifiOff className="h-3.5 w-3.5" /> منفصل
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-20">
        <Outlet />
      </main>

      <IncomingOfferModal />

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur grid grid-cols-3">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.to
            : pathname === t.to || pathname.startsWith(`${t.to}/`);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
