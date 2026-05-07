/**
 * Phase T-B.2 — Active Driver Tracking
 * ------------------------------------
 * Resolves an order → its assigned driver, then subscribes to that
 * driver's `driver_positions` row via Supabase Realtime. Used by the
 * customer "track your driver" map and the admin dispatch board.
 *
 * Realtime channel filter limits the wire to a single PK row, so the
 * customer never sees other drivers' positions even with broad RLS.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DriverStatus } from "@/features/driver/store/useDriverTelemetry";

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

type Args = { orderId?: string; driverId?: string };

// driver_positions stores `position` as PostGIS geography. The wire
// representation we receive over postgres_changes is a hex-encoded WKB
// string (SRID=4326). Decoding it client-side avoids a round-trip RPC.
function decodeWkbPoint(hex: string | null | undefined): { lat: number; lng: number } | null {
  if (!hex || hex.length < 50) return null;
  try {
    // EWKB format: byteOrder(1) + type(4) + srid?(4) + x(8) + y(8)
    // We just extract the last 16 bytes (lng then lat as little-endian doubles).
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

export function useActiveDriverTracking({ orderId, driverId }: Args) {
  const [resolvedDriverId, setResolvedDriverId] = useState<string | null>(driverId ?? null);
  const [position, setPosition] = useState<DriverLivePosition | null>(null);

  // Resolve order → driver_id once
  useEffect(() => {
    if (driverId) { setResolvedDriverId(driverId); return; }
    if (!orderId) return;
    let active = true;
    supabase.from("orders").select("driver_id").eq("id", orderId).maybeSingle()
      .then(({ data }) => {
        if (active && data?.driver_id) setResolvedDriverId(data.driver_id);
      });
    return () => { active = false; };
  }, [orderId, driverId]);

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
