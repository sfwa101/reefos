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

// ---- Hakim Insights & Advisor (Wave R-1 · Batch 6) ------------------------
export type HakimInsightRow = {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  summary: string;
  recommendations: Array<{ action: string; priority: string }>;
  generated_for_date: string;
  created_at: string;
  is_read: boolean;
};

export const listHakimInsightsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<HakimInsightRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("hakim_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as HakimInsightRow[];
  });

export const runHakimAdvisorFn = createServerFn({ method: "POST" })
  .inputValidator((d: { kind?: string; days?: number; question?: string }) => {
    const kind = String(d?.kind ?? "on_demand").trim().slice(0, 40);
    const days = Number.isFinite(Number(d?.days)) ? Math.max(1, Math.min(90, Math.floor(Number(d?.days)))) : 7;
    const raw = String(d?.question ?? "").trim();
    const question = raw ? raw.slice(0, 1000) : undefined;
    return { kind, days, question };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { data: out, error } = await sb.functions.invoke("hakim-advisor", { body: data });
    if (error) throw new Error(error.message ?? "advisor_failed");
    if (out && typeof out === "object" && "error" in out && out.error) {
      throw new Error(String((out as { error: unknown }).error));
    }
    return { ok: true };
  });

// ---- Hakim Architect (Sovereign Blueprint Summoning) ---------------------
export type HakimArchitectBlueprint = {
  module_name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suggested_assets: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdui_layout: any;
};

export const summonHakimArchitectFn = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string }) => {
    const prompt = String(d?.prompt ?? "").trim();
    if (!prompt) throw new Error("prompt_required");
    if (prompt.length > 4000) throw new Error("prompt_too_long");
    return { prompt };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<HakimArchitectBlueprint> => {
    const sb = context.supabase as SbAny;
    const { data: out, error } = await sb.functions.invoke("hakim_architect", {
      body: { prompt: data.prompt },
    });
    if (error) throw new Error(error.message ?? "ai_invoke_failed");
    if (!out?.ok || !out?.blueprint) throw new Error(out?.error ?? "no_blueprint");
    return out.blueprint as HakimArchitectBlueprint;
  });

// ============= Wave R-2 Batch A.2 — Hakim Pulse Banner & Advisor Report =============
export type HakimPulseBannerResult = {
  pulse?: string;
  insights?: Record<string, { text: string; tone: "positive" | "neutral" | "warning" | "critical" }>;
  error?: "rate_limited" | "credits_exhausted" | "failed";
};

export const getHakimPulseBannerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { metrics: Record<string, unknown>; page?: string }) => {
    const page = String(d?.page ?? "finance").trim().slice(0, 60);
    const metrics =
      d?.metrics && typeof d.metrics === "object" ? (d.metrics as Record<string, unknown>) : {};
    return { metrics, page };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<HakimPulseBannerResult> => {
    const sb = context.supabase as SbAny;
    try {
      const { data: out, error } = await sb.functions.invoke("hakim-pulse", { body: data });
      if (error) return { error: "failed" };
      const o = (out ?? {}) as Record<string, unknown>;
      if (o.error === "rate_limited") return { error: "rate_limited" };
      if (o.error === "credits_exhausted") return { error: "credits_exhausted" };
      return {
        pulse: typeof o.pulse === "string" ? (o.pulse as string) : undefined,
        insights: o.insights as HakimPulseBannerResult["insights"],
      };
    } catch {
      return { error: "failed" };
    }
  });

export const getHakimAdvisorReportFn = createServerFn({ method: "POST" })
  .inputValidator((d: { kind?: string; days?: number; question?: string }) => {
    const kind = String(d?.kind ?? "on_demand").trim().slice(0, 40);
    const days = Number.isFinite(Number(d?.days))
      ? Math.max(1, Math.min(90, Math.floor(Number(d?.days))))
      : 30;
    const raw = String(d?.question ?? "").trim();
    const question = raw ? raw.slice(0, 1000) : undefined;
    return { kind, days, question };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ report: string }> => {
    const sb = context.supabase as SbAny;
    const { data: out, error } = await sb.functions.invoke("hakim-advisor", { body: data });
    if (error) throw new Error(error.message ?? "advisor_failed");
    const o = (out ?? {}) as Record<string, unknown>;
    if (o.error) throw new Error(String(o.error));
    const report =
      (typeof o.report === "string" && o.report) ||
      (typeof o.content === "string" && o.content) ||
      (typeof o.text === "string" && o.text) ||
      "";
    return { report: report || "تعذّر إنشاء التقرير الآن." };
  });
