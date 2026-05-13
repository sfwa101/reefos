/**
 * MarketingGateway — Sovereign marketing/nudge boundary (Wave B-5).
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §3 + §10):
 *   • Only place permitted to read flash-sale tables, the
 *     `category_affinity` RPC, and write to `notifications` from UI paths.
 *   • Returns a single typed VM for the inactivity nudger.
 */
import { supabase } from "@/integrations/supabase/client";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    let category: string | null = null;
    if (userId) {
      const { data } = await sb.rpc("category_affinity", { _user_id: userId });
      const top = (data ?? [])[0];
      category = top?.category ?? null;
    }

    const { data: sale } = await sb
      .from("flash_sales")
      .select("id")
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sale) return null;

    const { data: items } = await sb
      .from("flash_sale_products")
      .select("product_id,product_name,discount_pct,category")
      .eq("flash_sale_id", sale.id)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      icon: input.icon ?? null,
    });
  },
};
