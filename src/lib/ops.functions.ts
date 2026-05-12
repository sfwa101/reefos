// Ops Gateway — Wave P-D · Phase D-8.
// Aggregates the Business-Ops Dashboard data behind `requireAdmin`.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

export type OpsKpiSnapshot = {
  revenue: number;
  count: number;
  aov: number;
  active: number;
};

export type OpsCriticalOrder = {
  id: string;
  customer_id: string | null;
  total_amount: number | null;
  status: string;
  delivery_info: Record<string, unknown> | null;
  created_at: string;
};

export type OpsLowStockItem = {
  id: string;
  sku_id: string;
  location_code: string | null;
  count: number;
  updated_at: string;
  name: string | null;
};

export type OpsKpis = {
  kpi: OpsKpiSnapshot;
  critical: OpsCriticalOrder[];
  lowStock: OpsLowStockItem[];
};

const ACTIVE_STATUSES = ["pending", "preparing", "out_for_delivery"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

function todayBoundsIso(): { startIso: string; endIso: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export const getOpsKpisFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<OpsKpis> => {
    const sb = context.supabase as SbAny;
    const { startIso, endIso } = todayBoundsIso();

    const [kpiRes, criticalRes, invRes] = await Promise.all([
      sb
        .from("salsabil_master_orders")
        .select("total_amount, status")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .neq("status", "cancelled")
        .limit(5000),
      sb
        .from("salsabil_master_orders")
        .select("id, customer_id, total_amount, status, delivery_info, created_at")
        .in("status", ACTIVE_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("salsabil_inventory_matrix")
        .select("id, sku_id, location_code, availability_data, updated_at")
        .eq("inventory_type", "count")
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);

    if (kpiRes.error) throw new Error(kpiRes.error.message);
    if (criticalRes.error) throw new Error(criticalRes.error.message);
    if (invRes.error) throw new Error(invRes.error.message);

    const kpiRows = (kpiRes.data ?? []) as Array<{ total_amount: number | null; status: string }>;
    const revenue = kpiRows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
    const count = kpiRows.length;
    const aov = count ? revenue / count : 0;
    const active = kpiRows.filter((r) => (ACTIVE_STATUSES as readonly string[]).includes(r.status)).length;

    const critical = (criticalRes.data ?? []) as OpsCriticalOrder[];

    type InvRow = {
      id: string;
      sku_id: string;
      location_code: string | null;
      availability_data: Record<string, unknown> | null;
      updated_at: string;
    };
    const invRows = (invRes.data ?? []) as InvRow[];
    const lowRaw = invRows
      .map((r) => {
        const raw = r.availability_data?.["count"];
        const cnt = typeof raw === "number" ? raw : Number(raw ?? NaN);
        return { ...r, count: cnt };
      })
      .filter((r) => Number.isFinite(r.count) && r.count <= 10)
      .slice(0, 25);

    let lowStock: OpsLowStockItem[] = [];
    if (lowRaw.length) {
      const skuIds = Array.from(new Set(lowRaw.map((r) => r.sku_id)));
      const { data: skus } = await sb
        .from("salsabil_skus")
        .select("id, sku_code, asset_id")
        .in("id", skuIds);
      const skuList = (skus ?? []) as Array<{ id: string; sku_code: string | null; asset_id: string | null }>;
      const assetIds = Array.from(
        new Set(skuList.map((s) => s.asset_id).filter((id): id is string => !!id)),
      );
      const assetsRes = assetIds.length
        ? await sb.from("salsabil_assets").select("id, name").in("id", assetIds)
        : { data: [] as Array<{ id: string; name: string | null }> };
      const assets = (assetsRes.data ?? []) as Array<{ id: string; name: string | null }>;
      const assetMap = new Map(assets.map((a) => [a.id, a.name]));
      const skuMap = new Map(
        skuList.map((s) => [
          s.id,
          { sku_code: s.sku_code, name: s.asset_id ? assetMap.get(s.asset_id) ?? null : null },
        ]),
      );
      lowStock = lowRaw.map((r) => {
        const meta = skuMap.get(r.sku_id);
        return {
          id: r.id,
          sku_id: r.sku_id,
          location_code: r.location_code,
          count: r.count,
          updated_at: r.updated_at,
          name: meta?.name ?? meta?.sku_code ?? r.sku_id.slice(0, 8),
        };
      });
    }

    return { kpi: { revenue, count, aov, active }, critical, lowStock };
  });
