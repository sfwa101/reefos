/**
 * DriverGateway — Sovereign boundary for the Driver / Dispatch domain (Wave P-3 §4).
 *
 * Constitutional contract (CONSTITUTION_AI_GOVERNANCE §2):
 *   • Only place permitted to read/write `drivers`, `salsabil_fulfillment_nodes`
 *     (driver scope), `salsabil_dispatch_offers`, `geo_zones`, and to call the
 *     `accept_dispatch_offer` RPC from UI-bound code paths.
 *   • Hooks consume typed methods + GatewayChannel handles. UI never imports
 *     the Supabase client for these tables.
 *
 * Wave P-13: JSONB patch payloads use `as never` to satisfy the generated
 * row typing without resorting to `any`.
 */
import { supabase } from "@/integrations/supabase/client";

export type GatewayChannel = { unsubscribe: () => void };

type AnyRow = Record<string, unknown>;

type NodeChangePayload = {
  new?: AnyRow;
  old?: AnyRow;
};

/* ─────────────────────────── Driver lookup ─────────────────────────── */

export const DriverGateway = {
  /** Resolve driver row id for a given auth user id. */
  async getDriverIdForUser(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  },

  /* ──────────────── Sovereign fulfillment nodes (driver scope) ──────────────── */

  /** Active fulfillment nodes assigned to a driver. */
  async listActiveDriverNodes(
    driverId: string,
    activeStatuses: string[],
  ): Promise<AnyRow[]> {
    const { data } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select(
        "id,master_order_id,status,total_amount,delivery_snapshot,assigned_at,picked_up_at,delivered_at",
      )
      .eq("driver_id", driverId)
      .in("status", activeStatuses as unknown as string[])
      .order("assigned_at", { ascending: false, nullsFirst: false });
    return (data ?? []) as AnyRow[];
  },

  /** Patch a fulfillment node (RLS gates this to the assigned driver). */
  async updateFulfillmentNode(
    nodeId: string,
    patch: Record<string, unknown>,
  ): Promise<{ error: { message: string } | null }> {
    const { error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .update(patch as never)
      .eq("id", nodeId);
    return { error: error ? { message: error.message } : null };
  },

  /** Realtime subscription on this driver's fulfillment nodes. */
  subscribeDriverNodes(
    driverId: string | null,
    onChange: (payload: NodeChangePayload) => void,
  ): GatewayChannel {
    const ch = supabase
      .channel(`driver-engine-nodes${driverId ? `-${driverId}` : ""}`)
      .on(
        "postgres_changes" as never,
        driverId
          ? {
              event: "*",
              schema: "public",
              table: "salsabil_fulfillment_nodes",
              filter: `driver_id=eq.${driverId}`,
            }
          : { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
        (payload: NodeChangePayload) => onChange(payload),
      )
      .subscribe();
    return {
      unsubscribe: () => {
        supabase.removeChannel(ch);
      },
    };
  },

  /* ─────────────────────────── Geo / surge zones ─────────────────────────── */

  /** Active geo_zones (raw rows; UI filters surge_active itself). */
  async listActiveGeoZones(): Promise<AnyRow[]> {
    
    const { data } = await supabase
      .from("geo_zones")
      .select("zone_code,name,current_load_factor,surge_active")
      .eq("is_active", true);
    return (data ?? []) as AnyRow[];
  },

  /** Realtime subscription on geo_zones. */
  subscribeGeoZones(onChange: () => void): GatewayChannel {
    const ch = supabase
      .channel("driver-engine-zones")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "geo_zones" },
        () => onChange(),
      )
      .subscribe();
    return {
      unsubscribe: () => {
        supabase.removeChannel(ch);
      },
    };
  },

  /* ──────────────────────── Dispatch offers (radar) ──────────────────────── */

  async listPendingDispatchOffers(driverId: string): Promise<AnyRow[]> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("salsabil_dispatch_offers")
      .select("id,node_id,driver_id,status,expires_at,created_at")
      .eq("driver_id", driverId)
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AnyRow[];
  },

  subscribeDispatchOffers(
    driverId: string,
    onChange: () => void,
  ): GatewayChannel {
    const ch = supabase
      .channel(`dispatch-radar-${driverId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "salsabil_dispatch_offers",
          filter: `driver_id=eq.${driverId}`,
        },
        () => onChange(),
      )
      .subscribe();
    return {
      unsubscribe: () => {
        supabase.removeChannel(ch);
      },
    };
  },

  async acceptDispatchOffer(
    offerId: string,
    driverId: string,
  ): Promise<{ data: unknown; error: { message: string } | null }> {
    const { data, error } = await supabase.rpc("accept_dispatch_offer", {
      p_offer_id: offerId,
      p_driver_id: driverId,
    });
    return { data, error: error ? { message: error.message } : null };
  },

  /* ─────────────────────── Driver live position tracking ─────────────────────── */

  subscribeDriverPosition(
    driverId: string,
    onChange: (row: AnyRow) => void,
  ): GatewayChannel {
    const ch = supabase
      .channel(`driver-pos-${driverId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "driver_positions",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload: { new?: AnyRow }) => {
          if (payload?.new) onChange(payload.new);
        },
      )
      .subscribe();
    return {
      unsubscribe: () => {
        supabase.removeChannel(ch);
      },
    };
  },
};
