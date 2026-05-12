// Sovereign Gateway — Wave R-1 · Batch 5.
// Admin-only handlers for the Imperial Treasury, Sovereign Tracing, and
// Sovereign Control Plane. All gated by `requireAdmin`.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---- Imperial Treasury -----------------------------------------------------
export type SovereignSettlementRow = {
  id: string;
  vendor_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  vendor: { business_name: string | null } | null;
};

export const listVendorSettlementsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<SovereignSettlementRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("salsabil_vendor_settlements")
      .select("*, vendor:salsabil_vendors(business_name)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as SovereignSettlementRow[];
  });

export const clearSovereignSettlementsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { vendor_id: string }) => {
    const v = String(d?.vendor_id ?? "").trim();
    if (!UUID_RE.test(v)) throw new Error("invalid_vendor_id");
    return { vendor_id: v };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<number> => {
    const sb = context.supabase as SbAny;
    const { data: out, error } = await sb.rpc("clear_sovereign_settlements", {
      p_vendor_id: data.vendor_id,
    });
    if (error) throw new Error(error.message);
    return Number(out ?? 0);
  });

// ---- Sovereign Tracing -----------------------------------------------------
export type SovereignEventRow = {
  id: string;
  trace_id: string;
  actor_id: string | null;
  event_domain: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const ALLOWED_DOMAINS = new Set([
  "all",
  "checkout",
  "wallet",
  "hakim",
  "auth",
  "admin",
  "sdui",
  "system",
  "control_plane",
]);

export const listEventTimelineFn = createServerFn({ method: "GET" })
  .inputValidator((d: { trace_id?: string; actor_id?: string; domain?: string; page?: number }) => {
    const trace = String(d?.trace_id ?? "").trim();
    const actor = String(d?.actor_id ?? "").trim();
    const domain = String(d?.domain ?? "all");
    const page = Math.max(0, Math.min(1000, Math.floor(Number(d?.page ?? 0))));
    if (trace && !UUID_RE.test(trace)) throw new Error("invalid_trace_id");
    if (actor && !UUID_RE.test(actor)) throw new Error("invalid_actor_id");
    if (!ALLOWED_DOMAINS.has(domain)) throw new Error("invalid_domain");
    return { trace_id: trace, actor_id: actor, domain, page };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<SovereignEventRow[]> => {
    const sb = context.supabase as SbAny;
    const PAGE_SIZE = 100;
    let q = sb
      .from("salsabil_event_timeline")
      .select("id, trace_id, actor_id, event_domain, event_type, payload, created_at")
      .order("created_at", { ascending: false })
      .range(data.page * PAGE_SIZE, data.page * PAGE_SIZE + PAGE_SIZE - 1);
    if (data.trace_id) q = q.eq("trace_id", data.trace_id);
    if (data.actor_id) q = q.eq("actor_id", data.actor_id);
    if (data.domain !== "all") q = q.eq("event_domain", data.domain);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as SovereignEventRow[];
  });

// ---- Sovereign Control Plane -----------------------------------------------
export type CircuitBreakerInfo = { reason: string; tripped_at: string } | null;

export const getCircuitBreakerForKeyFn = createServerFn({ method: "GET" })
  .inputValidator((d: { key: string }) => {
    const k = String(d?.key ?? "").trim();
    if (!/^[a-z0-9_]{3,64}$/.test(k)) throw new Error("invalid_key");
    return { key: k };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<CircuitBreakerInfo> => {
    const sb = context.supabase as SbAny;
    const { data: rows, error } = await sb
      .from("salsabil_event_timeline")
      .select("payload, created_at")
      .eq("event_domain", "system")
      .eq("event_type", "circuit_breaker_tripped")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return null;
    const hit = (rows ?? []).find(
      (row: SbAny) => (row.payload as { setting_key?: string } | null)?.setting_key === data.key,
    );
    if (!hit) return null;
    const p = hit.payload as { reason?: string };
    return { reason: p?.reason ?? "circuit breaker", tripped_at: hit.created_at as string };
  });

export const getSystemHealthBreakerFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<{ created_at: string } | null> => {
    const sb = context.supabase as SbAny;
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { data, error } = await sb
      .from("salsabil_event_timeline")
      .select("created_at")
      .eq("event_domain", "system")
      .eq("event_type", "circuit_breaker_tripped")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return null;
    return ((data ?? [])[0] ?? null) as { created_at: string } | null;
  });
