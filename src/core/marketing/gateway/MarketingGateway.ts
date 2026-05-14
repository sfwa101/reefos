/**
 * MarketingGateway — Sovereign marketing/nudge boundary (Wave B-5).
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §3 + §10):
 *   • Only place permitted to read flash-sale tables, the
 *     `category_affinity` RPC, and write to `notifications` from UI paths.
 *   • Returns a single typed VM for the inactivity nudger.
 */
import { supabase } from "@/integrations/supabase/client";
import { dynamicSb } from "@/integrations/supabase/dynamic";

export type GatewayChannel = { unsubscribe: () => void };

type AnyRow = Record<string, unknown>;

export interface InactivityPickVM {
  product_id: string;
  product_name: string;
  discount_pct: number;
  category: string | null;
}

export const MarketingGateway = {
  /**
   * Resolve a flash-sale pick aligned with the user's top affinity category.
   * Falls back to the first product of the active flash sale, or null.
   */
  async getInactivityPick(userId: string | null): Promise<InactivityPickVM | null> {
    
    const sb = dynamicSb;

    let category: string | null = null;
    if (userId) {
      const { data } = await sb.rpc<Array<{ category: string | null }>>("category_affinity", { _user_id: userId });
      const top = (data ?? [])[0];
      category = top?.category ?? null;
    }

    const { data: sale } = await sb
      .from<{ id: string }>("flash_sales")
      .select("id")
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sale) return null;

    const { data: items } = await sb
      .from("flash_sale_products")
      .select("product_id,product_name,discount_pct,category")
      .eq("flash_sale_id", (sale as { id: string }).id)
      .order("rank")
      .limit(5);

    const list = (items ?? []) as InactivityPickVM[];
    const pick = list.find((it) => category && it.category === category) ?? list[0];
    return pick ?? null;
  },

  async createNotification(input: {
    userId: string;
    title: string;
    body: string;
    icon?: string;
  }): Promise<void> {
    
    await supabase.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      icon: input.icon ?? null,
    });
  },

  /* ───────────────────── Featured categories (root) ───────────────────── */

  async listFeaturedRootCategories(): Promise<AnyRow[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, icon, sort_order, parent_id")
      .is("parent_id", null)
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as unknown as AnyRow[];
  },

  /* ───────────────────── Banners + Flash Sales ───────────────────── */

  async listBanners(placement: string): Promise<AnyRow[]> {
    
    const { data, error } = await supabase
      .from("banners")
      .select(
        "id,title,subtitle,image_url,placement,link_url,category_slug,sort_order,starts_at,ends_at,is_active",
      )
      .eq("placement", placement)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AnyRow[];
  },

  async getActiveFlashSale(): Promise<AnyRow | null> {
    
    const { data: sales } = await supabase
      .from("flash_sales")
      .select("id,ends_at,cycle_label")
      .eq("is_active", true)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .limit(1);
    return ((sales?.[0] ?? null) as AnyRow | null);
  },

  async listFlashSaleProducts(saleId: string): Promise<AnyRow[]> {
    
    const { data: items } = await supabase
      .from("flash_sale_products")
      .select(
        "id,product_id,product_name,category,original_price,discount_pct,reason,rank",
      )
      .eq("flash_sale_id", saleId)
      .order("rank", { ascending: true });
    return ((items ?? []) as AnyRow[]);
  },

  /* ───────────────────── Buy-again (Sovereign Matrix) ───────────────────── */

  async listRecentMasterOrderIds(customerId: string, limit = 20): Promise<string[]> {
    const { data, error } = await supabase
      .from("salsabil_master_orders")
      .select("id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  },

  async listFulfillmentNodeIdsForMasters(masterIds: string[]): Promise<string[]> {
    const { data, error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select("id")
      .in("master_order_id", masterIds);
    if (error) throw error;
    return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  },

  async listFulfillmentItemsForNodes(
    nodeIds: string[],
    limit = 120,
  ): Promise<Array<{ salsabil_skus: { asset_id: string | null } | null }>> {
    const { data, error } = await supabase
      .from("salsabil_fulfillment_items")
      .select("created_at, salsabil_skus!inner(asset_id)")
      .in("node_id", nodeIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Array<{
      salsabil_skus: { asset_id: string | null } | null;
    }>;
  },

  /* ───────────────────── Spatio-temporal offers ───────────────────── */

  async listActiveOffersMatrix(): Promise<{
    data: AnyRow[];
    error: { message: string } | null;
  }> {
    
    const sb = dynamicSb;
    const { data, error } = await sb
      .from("offers_matrix")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });
    return {
      data: (data ?? []) as AnyRow[],
      error: error ? { message: error.message } : null,
    };
  },

  /* ───────────────────── Group Buy ───────────────────── */

  subscribeGroupBuyCampaign(
    campaignId: string,
    handlers: {
      onCampaignUpdate: (next: AnyRow) => void;
      onPledgeChange: () => void;
    },
  ): GatewayChannel {
    const ch = supabase
      .channel(`gb-campaign-${campaignId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "UPDATE",
          schema: "public",
          table: "group_buy_campaigns",
          filter: `id=eq.${campaignId}`,
        },
        (payload: { new?: AnyRow }) => {
          if (payload?.new) handlers.onCampaignUpdate(payload.new);
        },
      )
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "group_buy_pledges",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => handlers.onPledgeChange(),
      )
      .subscribe();
    return {
      unsubscribe: () => {
        supabase.removeChannel(ch);
      },
    };
  },

  /* ───────────────────── Affiliate / Referral ───────────────────── */

  async getReferralCode(userId: string): Promise<string | null> {
    const { data: rc } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle();
    if (rc?.code) return rc.code as string;
    const { data: prof } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();
    return (prof?.referral_code as string | null) ?? null;
  },

  async ensureReferralCode(userId: string): Promise<string> {
    
    const { data, error } = await supabase.rpc(
      "ensure_referral_code",
      { _user_id: userId },
    );
    if (error) throw error;
    return data as string;
  },

  async listAffiliateTiers(): Promise<AnyRow[]> {
    const { data, error } = await supabase
      .from("affiliate_tiers")
      .select("*")
      .order("rank", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as AnyRow[];
  },

  async getUserAffiliateState(userId: string): Promise<AnyRow | null> {
    const { data, error } = await supabase
      .from("user_affiliate_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as AnyRow | null;
  },

  async listCommissionLedger(userId: string, limit = 100): Promise<AnyRow[]> {
    const { data, error } = await supabase
      .from("commission_ledger")
      .select(
        "id, order_id, product_name, category, commission_amount, status, created_at, paid_at, vest_release_at",
      )
      .eq("affiliate_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as AnyRow[];
  },

  /**
   * Wave P-3 Sub-Wave 11 — Storefront rails feed for the offers page.
   * Returns active rails ordered by `sort_order`. Live-window filtering
   * (frequency_tag, starts_at/ends_at) is performed by the caller.
   */
  async listActiveStorefrontRails(): Promise<AnyRow[]> {
    
    const { data, error } = await supabase
      .from("storefront_rails")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AnyRow[];
  },
};
