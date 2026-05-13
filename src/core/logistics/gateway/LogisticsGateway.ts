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
} from "@/core-os/barq-logistics/core/types";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
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
