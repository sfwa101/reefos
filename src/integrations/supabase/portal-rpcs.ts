// Strictly-typed RPC wrappers for portal stats endpoints. These RPCs return
// `Json` in the generated Supabase types (free-form payloads), so we cast
// the parsed Json into the precise shape consumed by the dashboards. This
// removes every `(supabase as any)` from the call sites without weakening
// the runtime contract — RLS still applies and shapes are documented here.

import { supabase } from "@/integrations/supabase/client";

export interface VendorPortalStats {
  vendor_ids: string[];
  products_count: number;
  orders_30d: number;
  revenue_30d: number;
  wallet: {
    available: number;
    pending: number;
    lifetime_earned: number;
    lifetime_paid: number;
  };
}

export interface DriverPortalStats {
  driver: { full_name: string; driver_type: string };
  today_tasks: number;
  today_delivered: number;
  wallet: {
    cash_in_hand: number;
    earned_balance: number;
    lifetime_earned: number;
    lifetime_settled: number;
  };
}

export interface MegaEvent {
  id: string;
  name: string;
  trigger_kind: string;
  banner_title: string | null;
  banner_subtitle: string | null;
  banner_color_hex: string | null;
  global_discount_pct: number | null;
  category_discounts: Record<string, number> | null;
}

export async function fetchVendorPortalStats(): Promise<{
  data: VendorPortalStats | null;
  error: { message: string } | null;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("vendor_portal_stats");
  return {
    data: (data as unknown as VendorPortalStats) ?? null,
    error: error ? { message: error.message } : null,
  };
}

export async function fetchDriverPortalStats(): Promise<{
  data: DriverPortalStats | null;
  error: { message: string } | null;
}> {
  const { data, error } = await supabase.rpc("driver_portal_stats");
  return {
    data: (data as unknown as DriverPortalStats) ?? null,
    error: error ? { message: error.message } : null,
  };
}

export async function fetchCurrentMegaEvent(): Promise<MegaEvent | null> {
  const { data } = await supabase.rpc("current_mega_event");
  return (data as unknown as MegaEvent) ?? null;
}
