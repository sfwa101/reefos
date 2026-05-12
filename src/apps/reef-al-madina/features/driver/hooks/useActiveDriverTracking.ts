/**
 * Phase 12.1 — Sovereign rewire.
 * Resolves a fulfillment node → its assigned driver, then subscribes
 * to that driver's `driver_positions` row via Supabase Realtime.
 *
 * Legacy `orders.driver_id` lookup is purged.
 */
import { useEffect, useState } from "react";
// EXEMPT: realtime channel subscription allowed (Wave P-D blueprint)
import { supabase } from "@/integrations/supabase/client";
import { getDriverPositionFn, resolveDriverIdFn } from "@/lib/driver.functions";
import type { DriverStatus } from "@/apps/reef-al-madina/features/driver/store/useDriverTelemetry";

export type DriverLivePosition = {
  driverId: string;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speedKmh: number | null;
  batteryPct: number | null;
  status: DriverStatus | null;
  updatedAt: string | null;
};

type Args = {
  /** Sovereign fulfillment node id (preferred). */
  nodeId?: string;
  /** Direct driver id, bypasses lookup. */
  driverId?: string;
  /**
   * Back-compat: callers still passing `orderId` are treated as
   * `master_order_id` against the Sovereign Matrix.
   */
  orderId?: string;
};

function decodeWkbPoint(hex: string | null | undefined): { lat: number; lng: number } | null {
  if (!hex || hex.length < 50) return null;
  try {
    const bytes = hex.match(/../g)?.map((b) => parseInt(b, 16));
    if (!bytes) return null;
    const buf = new Uint8Array(bytes);
    const view = new DataView(buf.buffer);
    const len = buf.byteLength;
    const little = view.getUint8(0) === 1;
    const lng = view.getFloat64(len - 16, little);
    const lat = view.getFloat64(len - 8, little);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function useActiveDriverTracking({ nodeId, driverId, orderId }: Args) {
  const [resolvedDriverId, setResolvedDriverId] = useState<string | null>(driverId ?? null);
  const [position, setPosition] = useState<DriverLivePosition | null>(null);

  // Resolve node/master-order → driver_id from the Sovereign Matrix.
  useEffect(() => {
    if (driverId) { setResolvedDriverId(driverId); return; }
    let active = true;
    const run = async () => {
      if (nodeId) {
        const { data } = await supabase
          .from("salsabil_fulfillment_nodes")
          .select("driver_id")
          .eq("id", nodeId)
          .maybeSingle();
        if (active && data?.driver_id) setResolvedDriverId(data.driver_id as string);
        return;
      }
      if (orderId) {
        const { data } = await supabase
          .from("salsabil_fulfillment_nodes")
          .select("driver_id")
          .eq("master_order_id", orderId)
          .not("driver_id", "is", null)
          .limit(1)
          .maybeSingle();
        if (active && data?.driver_id) setResolvedDriverId(data.driver_id as string);
      }
    };
    run();
    return () => { active = false; };
  }, [nodeId, orderId, driverId]);

  // Initial fetch + realtime subscription scoped to this driver only
  useEffect(() => {
    if (!resolvedDriverId) return;
    let active = true;

    const apply = (row: Record<string, unknown> | null) => {
      if (!active || !row) return;
      const point = decodeWkbPoint(row.position as string | null);
      setPosition({
        driverId: resolvedDriverId,
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
        heading: (row.heading_deg as number | null) ?? null,
        speedKmh: (row.speed_kmh as number | null) ?? null,
        batteryPct: (row.battery_pct as number | null) ?? null,
        status: (row.status as DriverStatus | null) ?? null,
        updatedAt: (row.updated_at as string | null) ?? null,
      });
    };

    supabase.from("driver_positions").select("*").eq("driver_id", resolvedDriverId).maybeSingle()
      .then(({ data }) => apply(data as Record<string, unknown> | null));

    const channel = supabase
      .channel(`driver-pos-${resolvedDriverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_positions",
          filter: `driver_id=eq.${resolvedDriverId}`,
        },
        (payload) => apply(payload.new as Record<string, unknown>),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [resolvedDriverId]);

  return { driverId: resolvedDriverId, position };
}
