/**
 * Phase 58 — Barq Operator Tasks page (under the new `_driver` token-pure
 * shell). Renders pickup-OTP banners for nodes the driver has been
 * dispatched to (status `assigned` or `ready_for_pickup`) and the active
 * task feed for in-flight deliveries.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverEngine } from "@/apps/reef-al-madina/features/driver/hooks/useDriverEngine";
import { ActiveTasksFeed } from "@/apps/reef-al-madina/features/driver/components/ActiveTasksFeed";
import { DriverEarningsBar } from "@/apps/reef-al-madina/features/driver/components/DriverEarningsBar";
import { DriverSurgeBanner } from "@/apps/reef-al-madina/features/driver/components/DriverSurgeBanner";

export const Route = createFileRoute("/_driver/driver-ops")({
  component: DriverOpsPage,
});

interface PickupNode {
  id: string;
  master_order_id: string | null;
  status: string;
  total_amount: number;
  otp: string | null;
}

function DriverOpsPage() {
  const engine = useDriverEngine();
  const [pickups, setPickups] = useState<PickupNode[]>([]);
  const [loadingPickups, setLoadingPickups] = useState(true);

  useEffect(() => {
    if (!engine.driverId) return;
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from("salsabil_fulfillment_nodes")
        .select("id, master_order_id, status, total_amount, delivery_snapshot")
        .eq("driver_id", engine.driverId)
        .in("status", ["assigned", "ready_for_pickup"]);
      if (cancelled) return;
      const list: PickupNode[] = (data ?? []).map((n) => {
        const snap = (n.delivery_snapshot ?? {}) as {
          handover?: { otp?: string };
        };
        return {
          id: n.id as string,
          master_order_id: (n.master_order_id as string | null) ?? null,
          status: n.status as string,
          total_amount: Number(n.total_amount ?? 0),
          otp: snap.handover?.otp ?? null,
        };
      });
      setPickups(list);
      setLoadingPickups(false);
    };
    refresh();
    const ch = supabase
      .channel(`driver-ops-pickups-${engine.driverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "salsabil_fulfillment_nodes",
          filter: `driver_id=eq.${engine.driverId}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [engine.driverId]);

  if (engine.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
      </div>
    );
  }

  if (!engine.driverId) {
    return (
      <p className="text-center text-muted-foreground py-8">
        حسابك غير مرتبط بمندوب نشط.
      </p>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <DriverEarningsBar earnings={engine.earnings} />
      <DriverSurgeBanner zones={engine.surgeZones} />

      {!loadingPickups && pickups.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[12px] font-display font-extrabold text-muted-foreground">
            رموز الاستلام · اقرأها لمحطة التسليم
          </h2>
          {pickups.map((p) => (
            <PickupOtpCard key={p.id} pickup={p} />
          ))}
        </section>
      )}

      <ActiveTasksFeed
        tasks={engine.tasks}
        orders={engine.orders}
        busyTaskId={engine.busyTaskId}
        onFire={engine.fireEvent}
        onComplete={engine.completeDelivery}
      />
    </div>
  );
}

function PickupOtpCard({ pickup }: { pickup: PickupNode }) {
  const shortId = pickup.id.slice(0, 6).toUpperCase();
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 ring-1 ring-primary/20">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-extrabold text-[13px] text-foreground">
          #{shortId}
        </span>
        <span className="text-[11.5px] text-muted-foreground tabular-nums">
          {pickup.total_amount.toFixed(2)} ج.م
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-[11px] text-muted-foreground">رمز الاستلام</p>
          <p
            className="font-mono font-extrabold text-[24px] tracking-[0.4em] text-primary tabular-nums"
            dir="ltr"
          >
            {pickup.otp ?? "----"}
          </p>
        </div>
        <span className="text-[10.5px] rounded-md bg-muted text-muted-foreground px-2 py-0.5 ring-1 ring-border">
          {pickup.status}
        </span>
      </div>
    </div>
  );
}
