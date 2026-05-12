// Hakim Gateway — Wave R-1 · Batch 5.
// Admin-only handlers for Hakim insights, anomalies, and category affinity.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const markHakimInsightReadFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    const id = String(d?.id ?? "").trim();
    if (!UUID_RE.test(id)) throw new Error("invalid_id");
    return { id };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("hakim_insights")
      .update({ is_read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveHakimAnomalyFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    const id = String(d?.id ?? "").trim();
    if (!UUID_RE.test(id)) throw new Error("invalid_id");
    return { id };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("hakim_anomalies")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Category Affinity (server-side aggregation) ---------------------------
export type CategoryAffinityRow = {
  category: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  affinity_score: number;
  unique_users: number;
};

export const getCategoryAffinityFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<CategoryAffinityRow[]> => {
    const sb = context.supabase as SbAny;
    const sinceIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from("user_behavior_logs")
      .select("event_type,category,user_id,weight")
      .not("category", "is", null)
      .gte("created_at", sinceIso)
      .limit(5000);
    if (error || !data) return [];

    type Bucket = CategoryAffinityRow & { _users: Set<string> };
    const buckets = new Map<string, Bucket>();
    for (const row of data as Array<{ event_type: string; category: string; user_id: string | null; weight: number }>) {
      const cat = row.category;
      if (!cat) continue;
      let b = buckets.get(cat);
      if (!b) {
        b = { category: cat, views: 0, add_to_cart: 0, purchases: 0, affinity_score: 0, unique_users: 0, _users: new Set() };
        buckets.set(cat, b);
      }
      const w = row.weight ?? 1;
      if (row.event_type === "view_product" || row.event_type === "view_category") b.views += w;
      else if (row.event_type === "add_to_cart") b.add_to_cart += w;
      else if (row.event_type === "purchase") b.purchases += w;
      if (row.user_id) b._users.add(row.user_id);
    }
    const result: CategoryAffinityRow[] = [];
    for (const b of buckets.values()) {
      b.unique_users = b._users.size;
      // weighted score: purchases x5, cart x2, views x1.
      b.affinity_score = b.purchases * 5 + b.add_to_cart * 2 + b.views;
      result.push({
        category: b.category,
        views: b.views,
        add_to_cart: b.add_to_cart,
        purchases: b.purchases,
        affinity_score: b.affinity_score,
        unique_users: b.unique_users,
      });
    }
    result.sort((a, b) => b.affinity_score - a.affinity_score);
    return result;
  });
