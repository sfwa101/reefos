/**
 * useDefaultDeliveryMethod
 * ----------------------------------------------------------------
 * Loads the default `standard` delivery method from `public.delivery_methods`.
 * Falls back to a hardcoded "standard" descriptor if the table is empty
 * or unreachable so the cart never blocks on a missing row.
 *
 * Phase 12.5 — minimal integration. A future MethodPicker will let the
 * user switch to "vip" or "scheduled".
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DeliveryMethod } from "@/core-os/barq-logistics/core/types";

const FALLBACK_STANDARD: DeliveryMethod = {
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

async function fetchStandard(): Promise<DeliveryMethod> {
  const { data, error } = await supabase
    .from("delivery_methods")
    .select(
      "id,code,name_ar,name_en,fee_multiplier,flat_surcharge,base_eta_mins,eta_label_ar,requires_scheduling,icon,sort_order,is_active",
    )
    .eq("is_active", true)
    .eq("code", "standard")
    .maybeSingle();

  if (error || !data) return FALLBACK_STANDARD;
  return rowToMethod(data as DeliveryMethodRow);
}

export function useDefaultDeliveryMethod() {
  return useQuery({
    queryKey: ["delivery_method", "standard"] as const,
    queryFn: fetchStandard,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
