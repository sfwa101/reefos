/**
 * VendorGateway — Sovereign Vendor wallet & inventory boundary (Wave B-5).
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §3 + §10):
 *   • Only place permitted to read `vendor_wallets`, `vendor_payouts`, and
 *     the inventory matrix join graph from UI-bound code.
 *   • Returns typed VMs; UI never imports the Supabase client for these tables.
 */
import { supabase } from "@/integrations/supabase/client";

export type GatewayChannel = { unsubscribe: () => void };

type AnyRow = Record<string, unknown>;

export interface VendorWalletVM {
  vendor_id: string;
  available_balance: number;
  pending_balance: number;
  lifetime_earned: number;
  lifetime_paid_out: number;
}

export interface VendorPayoutVM {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  created_at: string;
}

export interface VendorInventoryRowVM {
  id: string;
  sku_id: string;
  sku_code: string;
  asset_id: string;
  asset_name: string;
  asset_description: string | null;
  count: number;
  override_price: number | null;
  base_price: number | null;
  currency: string | null;
  updated_at: string;
}

export const VendorGateway = {
  async listVendorWalletsAndPayouts(): Promise<{
    wallets: VendorWalletVM[];
    payouts: VendorPayoutVM[];
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [w, p] = await Promise.all([
      sb.from("vendor_wallets").select("*"),
      sb
        .from("vendor_payouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return {
      wallets: (w.data ?? []) as VendorWalletVM[],
      payouts: (p.data ?? []) as VendorPayoutVM[],
    };
  },

  async listVendorInventory(vendorId: string): Promise<VendorInventoryRowVM[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from("salsabil_inventory_matrix")
      .select(`
        id, sku_id, location_code, availability_data, updated_at,
        sku:salsabil_skus!inner(
          id, sku_code,
          asset:salsabil_assets!inner(
            id, name, description,
            salsabil_financial_contracts(base_price, currency, is_active, valid_from)
          )
        )
      `)
      .eq("location_code", vendorId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((r): VendorInventoryRowVM => {
      const av = (r.availability_data ?? {}) as Record<string, unknown>;
      const contracts = (r.sku?.asset?.salsabil_financial_contracts ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c.is_active)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
      const active = contracts[0];
      return {
        id: r.id,
        sku_id: r.sku_id,
        sku_code: r.sku?.sku_code ?? "—",
        asset_id: r.sku?.asset?.id ?? "",
        asset_name: r.sku?.asset?.name ?? "—",
        asset_description: r.sku?.asset?.description ?? null,
        count: Number(av.count ?? 0),
        override_price: av.override_price != null ? Number(av.override_price) : null,
        base_price: active ? Number(active.base_price) : null,
        currency: active?.currency ?? null,
        updated_at: r.updated_at,
      };
    });
  },
};
