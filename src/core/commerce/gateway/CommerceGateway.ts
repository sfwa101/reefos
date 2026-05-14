/**
 * CommerceGateway — Sovereign bridge for storefront commercial operations.
 *
 * Constitutional role (per CONSTITUTION_AI_GOVERNANCE.md §4):
 *   The UI MUST NOT import the Supabase client to perform commerce reads or
 *   mutations. All cart-side, order-side, and buy-it-again traversals of the
 *   Sovereign Asset graph (salsabil_master_orders → fulfillment_nodes →
 *   fulfillment_items → salsabil_skus → salsabil_assets) flow through here.
 *
 * Catalog VM hydration (ProductCardVM/ProductDetailsVM) continues to flow via
 * `catalogGateway` — this gateway covers the *order-history* and
 * *shared-cart-participant* surfaces that catalogGateway does not own.
 */
import { supabase } from "@/integrations/supabase/client";
import { IdentityGateway } from "@/core/identity";

export type SharedCartSplitType = "percentage" | "fixed" | "itemized";

export const CommerceGateway = {
  /**
   * Update a shared-cart participant's split rule. Authoritative mutation —
   * RLS enforces participant ownership.
   */
  async updateSharedCartParticipantSplit(
    participantId: string,
    splitType: SharedCartSplitType,
    splitValue: number,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await dynamicSb
      .from("shared_cart_participants")
      .update({ split_type: splitType, split_value: splitValue })
      .eq("id", participantId);
    if (error) throw error;
  },

  /**
   * Resolve the current user's recently-purchased asset IDs by traversing the
   * Sovereign Asset graph. Returns canonical `salsabil_assets.id` UUIDs in
   * recency order, deduplicated, capped at `limit`.
   *
   * UI must hydrate these into ProductCardVMs through `catalogGateway`
   * (or temporarily through legacy adapters until Wave B-3).
   */
  async getRecentlyPurchasedAssetIds(limit = 60): Promise<string[]> {
    const uid = await IdentityGateway.getCurrentUserId();
    if (!uid) return [];

    const { data: masters } = await supabase
      .from("salsabil_master_orders")
      .select("id")
      .eq("customer_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    const masterIds = (masters ?? []).map((m) => m.id);
    if (masterIds.length === 0) return [];

    const { data: nodes } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select("id")
      .in("master_order_id", masterIds);
    const nodeIds = (nodes ?? []).map((n) => n.id);
    if (nodeIds.length === 0) return [];

    const { data, error } = await supabase
      .from("salsabil_fulfillment_items")
      .select("created_at, salsabil_skus!inner(asset_id)")
      .in("node_id", nodeIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];

    const rows = data as unknown as Array<{
      salsabil_skus: { asset_id: string | null } | null;
    }>;

    return Array.from(
      new Set(
        rows
          .map((r) => r.salsabil_skus?.asset_id)
          .filter((aid): aid is string => Boolean(aid)),
      ),
    );
  },
};

export type CommerceGatewayType = typeof CommerceGateway;
