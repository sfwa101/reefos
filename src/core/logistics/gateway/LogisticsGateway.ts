/**
 * LogisticsGateway — Sovereign Logistics boundary (Wave B-3).
 *
 * Constitutional contract (CONSTITUTION_AI_GOVERNANCE §4):
 *   • Only place permitted to read `delivery_methods` and write `addresses`
 *     from UI-bound code paths.
 *   • Returns typed VMs; UI never imports the Supabase client for these tables.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  BuildingType,
  DeliveryMethod,
} from "@/core/logistics/core/types";
import { Tracer } from "@/core/system/observability/Tracer";

export const FALLBACK_STANDARD_DELIVERY_METHOD: DeliveryMethod = {
  id: "fallback-standard",
  code: "standard",
  nameAr: "توصيل عادي",
  nameEn: "Standard Delivery",
  feeMultiplier: 1,
  flatSurcharge: 0,
  baseEtaMins: 0,
  etaLabelAr: "خلال ساعة",
  requiresScheduling: false,
  icon: null,
  sortOrder: 0,
  isActive: true,
};

type DeliveryMethodRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  fee_multiplier: number;
  flat_surcharge: number;
  base_eta_mins: number;
  eta_label_ar: string;
  requires_scheduling: boolean;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

function rowToMethod(r: DeliveryMethodRow): DeliveryMethod {
  return {
    id: r.id,
    code: r.code,
    nameAr: r.name_ar,
    nameEn: r.name_en,
    feeMultiplier: Number(r.fee_multiplier),
    flatSurcharge: Number(r.flat_surcharge),
    baseEtaMins: Number(r.base_eta_mins),
    etaLabelAr: r.eta_label_ar,
    requiresScheduling: r.requires_scheduling,
    icon: r.icon,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  };
}

export type CreateAddressInput = {
  userId: string;
  label: string;
  city: string;
  district: string | null;
  street: string;
  buildingType: BuildingType;
  floor: string | null;
  apartmentNo: string | null;
  recipientName: string | null;
  recipientPhone: string;
  instructions: string | null;
  lat: number | null;
  lng: number | null;
};

export type SavedAddressVM = {
  id: string;
  label: string;
  city: string;
  district: string | null;
  street: string | null;
  is_default: boolean;
};

export const LogisticsGateway = {
  /**
   * Active default "standard" delivery method, or a sane fallback when the
   * table is empty / unreachable.
   */
  async getDefaultStandardDeliveryMethod(): Promise<DeliveryMethod> {
    const { data, error } = await supabase
      .from("delivery_methods")
      .select(
        "id,code,name_ar,name_en,fee_multiplier,flat_surcharge,base_eta_mins,eta_label_ar,requires_scheduling,icon,sort_order,is_active",
      )
      .eq("is_active", true)
      .eq("code", "standard")
      .maybeSingle();
    if (error || !data) return FALLBACK_STANDARD_DELIVERY_METHOD;
    return rowToMethod(data as DeliveryMethodRow);
  },

  /**
   * List the current user's saved delivery addresses, default-first.
   */
  async listAddresses(userId: string): Promise<SavedAddressVM[]> {
    if (!userId) return [];
    const { data } = await supabase
      .from("addresses")
      .select("id,label,city,district,street,is_default")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    return ((data ?? []) as SavedAddressVM[]);
  },

  /**
   * Persist a new delivery address. Returns the new row id, or null on failure.
   * RLS enforces that user_id matches the authenticated user.
   */
  async createAddress(input: CreateAddressInput): Promise<string | null> {
    
    const { data, error } = await supabase
      .from("addresses")
      .insert({
        user_id: input.userId,
        label: input.label,
        city: input.city,
        district: input.district,
        street: input.street,
        building: null,
        building_type: input.buildingType,
        floor: input.floor,
        apartment_no: input.apartmentNo,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        delivery_instructions: input.instructions,
        lat: input.lat,
        lng: input.lng,
        is_default: false,
      })
      .select("id")
      .single();
    if (error || !data) return null;
    return data.id as string;
  },
};

export type LogisticsGatewayType = typeof LogisticsGateway;

/* ────────────────── Wave P-3 §12 — Sovereign Logistics extensions ────────────────── */

export type GatewayChannel = { unsubscribe: () => void };
type AnyRow = Record<string, unknown>;

export type GeoZoneRow = {
  zone_code: string;
  name: string;
  short_name: string;
  districts: string[] | null;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  eta_label: string;
  eta_minutes: number | null;
  cod_allowed: boolean;
  accepts_perishables: boolean;
  accent: string | null;
  sort_order: number;
};

export type ZoneOpsRow = {
  zone_code: string;
  current_load_factor: number;
  base_eta_minutes: number | null;
  surge_active: boolean;
};

export type DispatchTicketRow = {
  id: string;
  master_order_id: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
};

export type DriverPickupNodeRow = {
  id: string;
  master_order_id: string | null;
  status: string;
  total_amount: number;
  delivery_snapshot: unknown;
};

export const LogisticsExtras = {
  /* Geo zones — full catalog with display metadata. */
  async listActiveGeoZones(): Promise<GeoZoneRow[]> {
    const { data, error } = await supabase
      .from("geo_zones")
      .select(
        "zone_code,name,short_name,districts,delivery_fee,free_delivery_threshold,eta_label,eta_minutes,cod_allowed,accepts_perishables,accent,sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data as GeoZoneRow[];
  },

  /* Geo zone operational metrics (for surge / ETA engine). */
  async listGeoZoneOps(zoneCode?: string): Promise<ZoneOpsRow[]> {
    let q = supabase
      .from("geo_zones")
      .select("zone_code,current_load_factor,base_eta_minutes,surge_active")
      .eq("is_active", true);
    if (zoneCode) q = q.eq("zone_code", zoneCode);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as ZoneOpsRow[];
  },

  /* Realtime: geo_zones (optionally filtered by zone_code). */
  subscribeGeoZoneOps(
    zoneCode: string | undefined,
    onChange: (row: AnyRow | undefined) => void,
  ): GatewayChannel {
    const ch = supabase
      .channel(`geo-zones-ops${zoneCode ? `:${zoneCode}` : ""}`)
      .on(
        "postgres_changes" as never,
        zoneCode
          ? { event: "*", schema: "public", table: "geo_zones", filter: `zone_code=eq.${zoneCode}` }
          : { event: "*", schema: "public", table: "geo_zones" },
        (payload: { new?: AnyRow; old?: AnyRow }) => {
          onChange(payload.new ?? payload.old);
        },
      )
      .subscribe();
    return { unsubscribe: () => { supabase.removeChannel(ch); } };
  },

  /* Dispatch board — nodes ready for pickup. */
  async listReadyForPickupNodes(): Promise<DispatchTicketRow[]> {
    const { data, error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select("id, master_order_id, total_amount, notes, created_at")
      .eq("status", "ready_for_pickup")
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as DispatchTicketRow[];
  },

  /* Realtime: all fulfillment nodes (dispatch board). */
  subscribeFulfillmentNodes(onChange: () => void): GatewayChannel {
    const ch = supabase
      .channel("dispatch-nodes")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
        () => onChange(),
      )
      .subscribe();
    return { unsubscribe: () => { supabase.removeChannel(ch); } };
  },

  /* Driver pickup queue — nodes assigned/ready for THIS driver. */
  async listDriverPickupNodes(driverId: string): Promise<DriverPickupNodeRow[]> {
    const { data, error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select("id, master_order_id, status, total_amount, delivery_snapshot")
      .eq("driver_id", driverId)
      .in("status", ["assigned", "ready_for_pickup"]);
    if (error || !data) return [];
    return data as DriverPickupNodeRow[];
  },

  /* Realtime: this driver's nodes. */
  subscribeDriverPickupNodes(
    driverId: string,
    onChange: () => void,
  ): GatewayChannel {
    const ch = supabase
      .channel(`driver-ops-pickups-${driverId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "salsabil_fulfillment_nodes",
          filter: `driver_id=eq.${driverId}`,
        },
        () => onChange(),
      )
      .subscribe();
    return { unsubscribe: () => { supabase.removeChannel(ch); } };
  },

  /* Confirm handover RPC. */
  async confirmHandover(args: {
    nodeId: string;
    otp: string;
    channel: "driver" | "walkin";
  }): Promise<{ error: { message: string } | null }> {
    
    const { error } = await supabase.rpc("confirm_handover", {
      p_node_id: args.nodeId,
      p_otp: args.otp,
      p_channel: args.channel,
    });
    return { error: error ? { message: error.message } : null };
  },

  /* Nearest drivers RPC (PostGIS). */
  async findNearestDrivers(
    lat: number,
    lng: number,
    radiusMeters = 5_000,
    limit = 5,
  ): Promise<Array<{ driver_id: string; distance_m: number; updated_at: string }>> {
    const { data, error } = await supabase.rpc("find_nearest_drivers", {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radiusMeters,
      p_limit: limit,
    });
    if (error) {
      Tracer.error("logistics", "findnearestdrivers_failed", { args: ["[findNearestDrivers] failed", error.message] });
      return [];
    }
    return (data ?? []) as Array<{ driver_id: string; distance_m: number; updated_at: string }>;
  },

  /* Maeen — active delivery existence check. */
  async hasActiveDelivery(userId: string, activeStatuses: readonly string[]): Promise<boolean> {
    const { data: masters, error: mErr } = await supabase
      .from("salsabil_master_orders")
      .select("id")
      .eq("customer_id", userId);
    if (mErr) throw mErr;
    const masterIds = (masters ?? []).map((m) => m.id as string);
    if (masterIds.length === 0) return false;
    const { count, error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select("id", { count: "exact", head: true })
      .in("master_order_id", masterIds)
      .in("status", activeStatuses as unknown as string[]);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
