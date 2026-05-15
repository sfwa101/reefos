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

/* ─────────────────────────── Duty Toggle (Wave D-1.A) ─────────────────────────── */

export type DriverShiftRow = {
  id: string;
  driver_id: string;
  started_at: string;
  ended_at: string | null;
};

type ShiftQuery = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        is: (c: string, v: null) => {
          order: (c: string, opts: { ascending: boolean }) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: DriverShiftRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
    insert: (v: Record<string, unknown>) => {
      select: (s: string) => {
        single: () => Promise<{
          data: DriverShiftRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
};

async function resolveDriverId(
  supabase: unknown,
  userId: string,
): Promise<string> {
  const { data, error } = await (
    supabase as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{
              data: { id: string } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("drivers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("driver_not_linked");
  return data.id;
}

export const getActiveDriverShiftFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriverShiftRow | null> => {
    const { supabase, userId } = context;
    const driverId = await resolveDriverId(supabase, userId);
    const { data, error } = await (supabase as unknown as ShiftQuery)
      .from("salsabil_driver_shifts")
      .select("id,driver_id,started_at,ended_at")
      .eq("driver_id", driverId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const startDriverShiftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriverShiftRow> => {
    const { supabase, userId } = context;
    const driverId = await resolveDriverId(supabase, userId);

    // Idempotent: return existing open shift if any.
    const { data: existing } = await (supabase as unknown as ShiftQuery)
      .from("salsabil_driver_shifts")
      .select("id,driver_id,started_at,ended_at")
      .eq("driver_id", driverId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return existing;

    const { data, error } = await (supabase as unknown as ShiftQuery)
      .from("salsabil_driver_shifts")
      .insert({ driver_id: driverId })
      .select("id,driver_id,started_at,ended_at")
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("shift_insert_failed");
    return data;
  });

export const endDriverShiftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; ended: number }> => {
    const { supabase, userId } = context;
    const driverId = await resolveDriverId(supabase, userId);

    const { data: open } = await (supabase as unknown as ShiftQuery)
      .from("salsabil_driver_shifts")
      .select("id,driver_id,started_at,ended_at")
      .eq("driver_id", driverId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!open) return { ok: true as const, ended: 0 };

    const { error } = await (supabase as unknown as ShiftQuery)
      .from("salsabil_driver_shifts")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", open.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, ended: 1 };
  });

/* ─────────────────────────── Dispatch task FSM (Wave D-1.B) ─────────────────────────── */

export type DispatchTaskAction = "arrived_vendor" | "picked_up" | "delivered";

type NodeQuery = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        maybeSingle: () => Promise<{
          data: { id: string; driver_id: string | null; status: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
};

export const updateDispatchTaskStatusFn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      nodeId: string;
      action: DispatchTaskAction;
      lat?: number | null;
      lng?: number | null;
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true; status: string }> => {
    const { supabase, userId } = context;
    const driverId = await resolveDriverId(supabase, userId);

    // Verify ownership (defence in depth — RLS also enforces).
    const { data: row, error: rowErr } = await (supabase as unknown as NodeQuery)
      .from("salsabil_fulfillment_nodes")
      .select("id,driver_id,status")
      .eq("id", data.nodeId)
      .maybeSingle();
    if (rowErr) throw new Error(rowErr.message);
    if (!row) throw new Error("task_not_found");
    if (row.driver_id !== driverId) throw new Error("not_assigned_to_you");

    const nowIso = new Date().toISOString();
    let patch: Record<string, unknown>;
    let nextStatus: string;

    switch (data.action) {
      case "arrived_vendor":
        nextStatus = "preparing";
        patch = { arrived_vendor_at: nowIso };
        break;
      case "picked_up":
        nextStatus = "out_for_delivery";
        patch = {
          status: nextStatus,
          picked_up_at: nowIso,
          ...(data.lat != null && data.lng != null
            ? { pickup_lat: data.lat, pickup_lng: data.lng }
            : {}),
        };
        break;
      case "delivered":
        nextStatus = "delivered";
        patch = {
          status: nextStatus,
          delivered_at: nowIso,
          ...(data.lat != null && data.lng != null
            ? { dropoff_lat: data.lat, dropoff_lng: data.lng }
            : {}),
        };
        break;
      default:
        throw new Error("invalid_action");
    }

    const { error: upErr } = await (supabase as unknown as NodeQuery)
      .from("salsabil_fulfillment_nodes")
      .update(patch)
      .eq("id", data.nodeId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true as const, status: nextStatus };
  });
