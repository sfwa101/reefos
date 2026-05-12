// Driver Gateway — Wave P-D · Phase D-4.
// Sanctioned `createServerFn` handlers covering driver telemetry pushes
// and the position-tracking reads used by the live customer-side map.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DriverStatus = "IDLE" | "EN_ROUTE" | "OFFLINE" | "BREAK";

export type DriverPositionPayload = {
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  batteryPct: number | null;
  status: DriverStatus;
  ts: number; // epoch ms
};

export const publishDriverPositionFn = createServerFn({ method: "POST" })
  .inputValidator((d: DriverPositionPayload) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const wkt = `SRID=4326;POINT(${data.lng} ${data.lat})`;
    const { error } = await (
      supabase as unknown as {
        from: (t: string) => {
          upsert: (v: Record<string, unknown>) => Promise<{
            error: { message: string } | null;
          }>;
        };
      }
    )
      .from("driver_positions")
      .upsert({
        driver_id: userId,
        position: wkt,
        heading_deg: data.heading,
        speed_kmh: data.speedKmh,
        battery_pct: data.batteryPct,
        status: data.status,
        updated_at: new Date(data.ts).toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type DriverPositionRow = {
  driver_id: string;
  position: string | null;
  heading_deg: number | null;
  speed_kmh: number | null;
  battery_pct: number | null;
  status: DriverStatus | null;
  updated_at: string | null;
};

export const getDriverPositionFn = createServerFn({ method: "GET" })
  .inputValidator((d: { driverId: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<DriverPositionRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              maybeSingle: () => Promise<{
                data: DriverPositionRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      }
    )
      .from("driver_positions")
      .select("*")
      .eq("driver_id", data.driverId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const resolveDriverIdFn = createServerFn({ method: "GET" })
  .inputValidator((d: { nodeId?: string; orderId?: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ driverId: string | null }> => {
    const { supabase } = context;
    if (data.nodeId) {
      const { data: row, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (c: string, v: string) => {
                maybeSingle: () => Promise<{
                  data: { driver_id: string | null } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        }
      )
        .from("salsabil_fulfillment_nodes")
        .select("driver_id")
        .eq("id", data.nodeId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { driverId: (row?.driver_id as string | null) ?? null };
    }
    if (data.orderId) {
      const { data: row, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (c: string, v: string) => {
                not: (c: string, op: string, v: null) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{
                      data: { driver_id: string | null } | null;
                      error: { message: string } | null;
                    }>;
                  };
                };
              };
            };
          };
        }
      )
        .from("salsabil_fulfillment_nodes")
        .select("driver_id")
        .eq("master_order_id", data.orderId)
        .not("driver_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { driverId: (row?.driver_id as string | null) ?? null };
    }
    return { driverId: null };
  });
