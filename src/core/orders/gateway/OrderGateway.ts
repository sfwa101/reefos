/**
 * OrderGateway — Sovereign Orders boundary (Wave B-3).
 *
 * Constitutional contract (CONSTITUTION_AI_GOVERNANCE §4 + SUPABASE_SOVEREIGNTY §2):
 *   • Only place permitted to read `salsabil_master_orders`,
 *     `salsabil_fulfillment_nodes`, and `salsabil_fulfillment_items` from
 *     UI-bound code paths.
 *   • All RPCs related to order lifecycle (e.g. `get_handover_otp`) flow here.
 *   • Returns typed VMs/DTOs; UI never touches the Supabase client directly.
 *
 * Scope (B-3):
 *   - getCustomerOrders()          — Account/Orders.tsx
 *   - getPickupOtp()               — OrderSuccess.tsx
 *   - getNodeItems()               — VendorOrders.tsx (details dialog)
 *   - subscribeVendorNodes()       — VendorOrders.tsx (realtime radar)
 */
import { supabase } from "@/integrations/supabase/client";
import { IdentityGateway } from "@/core/identity";

export type SovereignOrderItemVM = {
  id: string;
  quantity: number;
  price_at_time: number;
  sku_id: string | null;
  salsabil_skus: {
    asset_id: string | null;
    salsabil_assets: { name: string | null; media: unknown } | null;
  } | null;
};

export type SovereignOrderNodeVM = {
  id: string;
  status: string;
  total_amount: number;
  vendor_id: string | null;
  salsabil_fulfillment_items: SovereignOrderItemVM[];
};

export type SovereignOrderVM = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  salsabil_fulfillment_nodes: SovereignOrderNodeVM[];
};

export type VendorNodeItemVM = {
  id: string;
  sku_id: string;
  quantity: number;
  price_at_time: number;
  sku_code: string | null;
  asset_name: string | null;
};

export type VendorNodeRealtimeEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
};

export const OrderGateway = {
  /**
   * Customer's master-order history with full sovereign tree expansion.
   */
  async getCustomerOrders(userId: string): Promise<SovereignOrderVM[]> {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("salsabil_master_orders")
      .select(`
        id, status, total_amount, created_at,
        salsabil_fulfillment_nodes (
          id, status, total_amount, vendor_id,
          salsabil_fulfillment_items (
            id, quantity, price_at_time, sku_id,
            salsabil_skus ( asset_id, salsabil_assets ( name, media ) )
          )
        )
      `)
      .eq("customer_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data as unknown as SovereignOrderVM[]) ?? [];
  },

  /**
   * Pickup / handover OTP for a master order. Tries delivery_snapshot first,
   * falls back to RPC when RLS hides the snapshot.
   */
  async getPickupOtp(masterOrderId: string): Promise<string | null> {
    if (!masterOrderId) return null;
    const { data: node } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select("id, delivery_snapshot")
      .eq("master_order_id", masterOrderId)
      .limit(1)
      .maybeSingle();
    if (!node) return null;
    const snap = (node.delivery_snapshot ?? {}) as { handover?: { otp?: string } };
    if (snap.handover?.otp) return snap.handover.otp;
    
    const { data: otp } = await supabase.rpc("get_handover_otp", {
      p_node_id: node.id as string,
    });
    return typeof otp === "string" ? otp : null;
  },

  /**
   * Items for a single vendor fulfillment node (vendor order-details dialog).
   */
  async getNodeItems(nodeId: string): Promise<VendorNodeItemVM[]> {
    if (!nodeId) return [];
    
    const sb = supabase;
    const { data, error } = await sb
      .from("salsabil_fulfillment_items")
      .select(`
        id, sku_id, quantity, price_at_time,
        sku:salsabil_skus(sku_code, asset:salsabil_assets(name))
      `)
      .eq("node_id", nodeId);
    if (error || !data) return [];
    type ItemRow = {
      id: string;
      sku_id: string;
      quantity: number;
      price_at_time: number | string;
      sku?: { sku_code?: string | null; asset?: { name?: string | null } | null } | null;
    };
    return (data as unknown as ItemRow[]).map((r): VendorNodeItemVM => ({
      id: r.id,
      sku_id: r.sku_id,
      quantity: r.quantity,
      price_at_time: Number(r.price_at_time),
      sku_code: r.sku?.sku_code ?? null,
      asset_name: r.sku?.asset?.name ?? null,
    }));
  },

  /**
   * Vendor-scoped realtime subscription on fulfillment_nodes.
   * Returns an unsubscribe function. Realtime is gateway-bound per
   * SUPABASE_SOVEREIGNTY §9.
   */
  subscribeVendorNodes(
    vendorId: string,
    onEvent: (e: VendorNodeRealtimeEvent) => void,
  ): () => void {
    const channel = supabase
      .channel(`vendor-fulfillment-${vendorId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "salsabil_fulfillment_nodes",
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload: { eventType?: "INSERT" | "UPDATE" | "DELETE" }) =>
          onEvent({ eventType: payload.eventType ?? "UPDATE" }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};

export type OrderGatewayType = typeof OrderGateway;
