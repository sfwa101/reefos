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
    
    const sb = supabase;
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
    
    const sb = supabase;
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
    
    type ContractRow = { is_active: boolean; valid_from: string; base_price: number; currency: string };
    type InvRow = {
      id: string;
      sku_id: string;
      updated_at: string;
      availability_data?: Record<string, unknown> | null;
      sku?: {
        sku_code?: string | null;
        asset?: {
          id?: string;
          name?: string | null;
          description?: string | null;
          salsabil_financial_contracts?: ContractRow[];
        } | null;
      } | null;
    };
    return ((data ?? []) as unknown as InvRow[]).map((r): VendorInventoryRowVM => {
      const av = (r.availability_data ?? {}) as Record<string, unknown>;
      const contracts = (r.sku?.asset?.salsabil_financial_contracts ?? [])
        .filter((c) => c.is_active)
        .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
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

  /* ───────────────────── Vendor identity (multi-tenant) ───────────────────── */

  async getCurrentVendorMembership(userId: string): Promise<{
    role: string;
    vendor: {
      id: string;
      business_name: string;
      logo_url: string | null;
      is_active: boolean;
      created_at: string;
    };
  } | null> {
    
    const sb = supabase;
    const { data, error } = await sb
      .from("salsabil_vendor_members")
      .select(
        "role, vendor:salsabil_vendors!inner(id, business_name, logo_url, is_active, created_at)",
      )
      .eq("user_id", userId)
      .eq("vendor.is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.vendor) return null;
    return { role: data.role as string, vendor: data.vendor };
  },

  async getUserVendorIds(userId: string): Promise<string[]> {
    
    const sb = supabase;
    const { data, error } = await sb.rpc("user_vendor_ids", {
      _user_id: userId,
    });
    if (error) throw error;
    return (data ?? []) as string[];
  },

  /* ───────────────────── Vendor catalog (Sovereign assets) ───────────────────── */

  async listSovereignAssetsCatalog(): Promise<AnyRow[]> {
    const { data, error } = await supabase
      .from("salsabil_assets")
      .select(`
        id, name, category_path, media,
        salsabil_skus (
          id, sort_order, is_active,
          salsabil_financial_contracts ( base_price ),
          salsabil_inventory_matrix ( availability_data )
        )
      `)
      .eq("is_active", true)
      .eq("asset_type", "physical")
      .order("name")
      .limit(500);
    if (error) throw error;
    return (data ?? []) as unknown as AnyRow[];
  },

  /* ───────────────────── Vendor live ops (fulfillment nodes) ───────────────────── */

  async listVendorLiveFulfillmentNodes(
    vendorIds: string[],
    activeStatuses: string[],
  ): Promise<AnyRow[]> {
    const { data, error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select(`
        id, status, vendor_id, master_order_id, created_at,
        salsabil_master_orders!salsabil_fulfillment_nodes_master_fk ( delivery_info ),
        salsabil_fulfillment_items (
          id, quantity, price_at_time, created_at,
          salsabil_skus (
            id,
            salsabil_assets ( id, name, media )
          )
        )
      `)
      .in("vendor_id", vendorIds)
      .in("status", activeStatuses)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return (data ?? []) as unknown as AnyRow[];
  },

  async upsertSkuInventory(
    skuId: string,
    availabilityData: { stock: number; is_active: boolean },
  ): Promise<{ error: { message: string } | null }> {
    
    const sb = supabase;
    const { error } = await sb
      .from("salsabil_inventory_matrix")
      .upsert(
        {
          sku_id: skuId,
          inventory_type: "stock",
          availability_data: availabilityData,
        } as never,
        { onConflict: "sku_id" },
      );
    return { error: error ? { message: error.message } : null };
  },

  subscribeVendorOps(
    vendorIds: string[],
    handlers: {
      onFulfillmentNode: (payload: {
        new?: AnyRow;
        old?: AnyRow;
        eventType?: string;
      }) => void;
      onFulfillmentItem: () => void;
      onInventory: () => void;
      onFinancialContract: () => void;
    },
  ): GatewayChannel {
    const ch = supabase
      .channel(`vendor-ops-${vendorIds.join("-")}`)
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
        (payload: { new?: AnyRow; old?: AnyRow; eventType?: string }) =>
          handlers.onFulfillmentNode(payload),
      )
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_fulfillment_items" },
        () => handlers.onFulfillmentItem(),
      )
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_inventory_matrix" },
        () => handlers.onInventory(),
      )
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_financial_contracts" },
        () => handlers.onFinancialContract(),
      )
      .subscribe();
    return {
      unsubscribe: () => {
        supabase.removeChannel(ch);
      },
    };
  },

  /* ───────────────────── Vendor settlement (wallets / ledger / payouts) ───────────────────── */

  async loadSettlementSnapshot(): Promise<{
    wallets: AnyRow[];
    ledger: AnyRow[];
    requests: AnyRow[];
  }> {
    
    const sb = supabase;
    const [w, l, r] = await Promise.all([
      sb.from("vendor_wallets").select("*, vendors(name)"),
      sb
        .from("vendor_wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80),
      sb
        .from("vendor_payout_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      wallets: (w.data ?? []) as AnyRow[],
      ledger: (l.data ?? []) as AnyRow[],
      requests: (r.data ?? []) as AnyRow[],
    };
  },

  async requestVendorPayout(args: {
    vendorId: string;
    amount: number;
    method: string;
    bankDetails: Record<string, unknown>;
  }): Promise<{ data: unknown; error: { message: string } | null }> {
    
    const { data, error } = await supabase.rpc(
      "request_vendor_payout",
      {
        _vendor_id: args.vendorId,
        _amount: args.amount,
        _method: args.method,
        _bank_details: args.bankDetails ?? {},
      } as never,
    );
    return { data, error: error ? { message: error.message } : null };
  },

  /* ─── Wave P-3 §12 — Settlements (RLS-scoped to current vendor members) ─── */
  async listVendorSettlements<T = Record<string, unknown>>(): Promise<T[]> {
    
    const { data } = await supabase
      .from("salsabil_vendor_settlements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as T[];
  },
};
