// Analytics Gateway — Wave R-2 · Batch A.2.
// Read-only admin aggregates for the AnalyticsCharts component.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

export type AnalyticsChartRow = {
  total: number;
  status: string;
  created_at: string;
};

const STATUS_PRIORITY = [
  "pending", "confirmed", "paid", "preparing", "ready",
  "assigned", "picked_up", "out_for_delivery", "delivered", "cancelled",
];

function aggregate(statuses: string[], fallback: string): string {
  if (!statuses.length) return fallback || "pending";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  const active = statuses.filter((s) => s !== "delivered" && s !== "cancelled");
  const pool = active.length ? active : statuses;
  return pool.reduce(
    (lo, s) => (STATUS_PRIORITY.indexOf(s) < STATUS_PRIORITY.indexOf(lo) ? s : lo),
    pool[0],
  );
}

export const getAnalyticsChartsDataFn = createServerFn({ method: "GET" })
  .inputValidator((d: { days?: number }) => {
    const n = Math.max(1, Math.min(60, Math.floor(Number(d?.days ?? 14))));
    return { days: n };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<AnalyticsChartRow[]> => {
    const sb = context.supabase as SbAny;
    const since = new Date();
    since.setDate(since.getDate() - (data.days - 1));
    since.setHours(0, 0, 0, 0);
    const { data: rows, error } = await sb
      .from("salsabil_master_orders")
      .select(
        "total_amount,status,created_at, salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk(status)",
      )
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as SbAny[]).map((m) => ({
      total: Number(m.total_amount ?? 0),
      status: aggregate(
        ((m.salsabil_fulfillment_nodes ?? []) as SbAny[]).map((n) => n.status),
        m.status ?? "pending",
      ),
      created_at: m.created_at as string,
    }));
  });
