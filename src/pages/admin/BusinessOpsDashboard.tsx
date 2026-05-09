/**
 * BusinessOpsDashboard — Phase 48.
 * Realtime command centre for the 100-day summer peak.
 *
 * Read-only by design: every status transition must flow through the
 * `admin_set_order_status` RPC built in Phase 37. This screen only
 * surfaces signals — it never mutates orders or inventory directly.
 *
 * Realtime hygiene: the master_orders subscription is wrapped in
 * `useVisibilitySocket` (Phase 44) so a hidden tab releases its socket
 * and re-subscribes (with a catch-up invalidation) on resume.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, ShoppingBag, Receipt, AlertTriangle, Activity,
  Loader2, ShieldAlert, Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { useVisibilitySocket } from "@/hooks/useVisibilitySocket";
import { tenantQueryKey } from "@/lib/tenantScope";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { fmtMoney } from "@/lib/format";

type OrderRow = {
  id: string;
  customer_id: string | null;
  total_amount: number | null;
  status: string;
  delivery_info: Record<string, unknown> | null;
  created_at: string;
};

const ACTIVE_STATUSES = ["pending", "preparing", "out_for_delivery"] as const;
const NON_CANCELLED_FILTER = "neq.cancelled";

const statusLabel: Record<string, string> = {
  pending: "بانتظار التأكيد",
  preparing: "قيد التجهيز",
  out_for_delivery: "مع المندوب",
};
const statusCls: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  preparing: "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  out_for_delivery: "bg-info/15 text-info",
};

function todayBoundsIso(): { startIso: string; endIso: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export default function BusinessOpsDashboard() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance") || hasRole("store_manager");
  const qc = useQueryClient();

  const { startIso, endIso } = useMemo(todayBoundsIso, []);

  // ── KPIs (today) ───────────────────────────────────────────────
  const kpiQuery = useQuery({
    queryKey: tenantQueryKey("admin", "ops", "kpi", startIso),
    enabled: allowed,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salsabil_master_orders")
        .select("total_amount, status")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .neq("status", "cancelled")
        .limit(5000);
      if (error) throw error;
      const rows = (data ?? []) as Array<Pick<OrderRow, "total_amount" | "status">>;
      const revenue = rows.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0);
      const count = rows.length;
      const aov = count ? revenue / count : 0;
      const active = rows.filter((r) => (ACTIVE_STATUSES as readonly string[]).includes(r.status)).length;
      return { revenue, count, aov, active };
    },
  });

  // ── Critical orders (live table) ───────────────────────────────
  const criticalQuery = useQuery({
    queryKey: tenantQueryKey("admin", "ops", "critical-orders"),
    enabled: allowed,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salsabil_master_orders")
        .select("id, customer_id, total_amount, status, delivery_info, created_at")
        .in("status", ACTIVE_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  // ── Low stock (count-based inventory) ──────────────────────────
  const lowStockQuery = useQuery({
    queryKey: tenantQueryKey("admin", "ops", "low-stock"),
    enabled: allowed,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salsabil_inventory_matrix")
        .select("id, sku_id, location_code, availability_data, updated_at")
        .eq("inventory_type", "count")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      type InvRow = { id: string; sku_id: string; location_code: string | null; availability_data: Record<string, unknown> | null; updated_at: string };
      const rows = (data ?? []) as InvRow[];
      const low = rows
        .map((r) => {
          const raw = r.availability_data?.["count"];
          const count = typeof raw === "number" ? raw : Number(raw ?? NaN);
          return { ...r, count };
        })
        .filter((r) => Number.isFinite(r.count) && r.count <= 10)
        .slice(0, 25);

      if (!low.length) return [] as Array<typeof low[number] & { name: string | null }>;

      // Resolve SKU → asset name in two hops (skus → assets).
      const skuIds = Array.from(new Set(low.map((r) => r.sku_id)));
      const { data: skus } = await supabase
        .from("salsabil_skus")
        .select("id, sku_code, asset_id")
        .in("id", skuIds);
      const skuList = (skus ?? []) as Array<{ id: string; sku_code: string | null; asset_id: string | null }>;
      const assetIds = Array.from(new Set(skuList.map((s) => s.asset_id).filter(Boolean) as string[]));
      const { data: assets } = assetIds.length
        ? await supabase.from("salsabil_assets").select("id, name").in("id", assetIds)
        : { data: [] as Array<{ id: string; name: string | null }> };
      const assetMap = new Map((assets ?? []).map((a) => [a.id as string, a.name as string | null]));
      const skuMap = new Map(skuList.map((s) => [s.id, { sku_code: s.sku_code, name: s.asset_id ? (assetMap.get(s.asset_id) ?? null) : null }]));
      return low.map((r) => {
        const meta = skuMap.get(r.sku_id);
        return { ...r, name: meta?.name ?? meta?.sku_code ?? r.sku_id.slice(0, 8) };
      });
    },
  });

  // ── Realtime: visibility-aware master_orders subscription ──────
  useVisibilitySocket(
    () => {
      const channel = supabase
        .channel("ops-master-orders")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "salsabil_master_orders" },
          () => {
            qc.invalidateQueries({ queryKey: tenantQueryKey("admin", "ops", "kpi", startIso) });
            qc.invalidateQueries({ queryKey: tenantQueryKey("admin", "ops", "critical-orders") });
          },
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    () => {
      // On hidden→visible resume, force a catch-up refetch.
      qc.invalidateQueries({ queryKey: tenantQueryKey("admin", "ops", "kpi", startIso) });
      qc.invalidateQueries({ queryKey: tenantQueryKey("admin", "ops", "critical-orders") });
      qc.invalidateQueries({ queryKey: tenantQueryKey("admin", "ops", "low-stock") });
    },
    [startIso],
    allowed,
  );

  if (rolesLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4" dir="rtl">
        <div className="bg-surface rounded-3xl p-6 max-w-sm text-center border border-border/40">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive mb-3" />
          <p className="text-sm">واجهة العمليات للأدمن / المالية / مدير المتجر فقط.</p>
        </div>
      </div>
    );
  }

  const kpi = kpiQuery.data;
  const critical = criticalQuery.data ?? [];
  const lowStock = lowStockQuery.data ?? [];

  return (
    <>
      <MobileTopbar title="مركز قيادة العمليات" />
      <div className="px-4 lg:px-6 pt-3 pb-10 max-w-6xl mx-auto space-y-5" dir="rtl">
        <div className="flex items-center gap-2 text-[11px] text-foreground-tertiary">
          <Radio className="h-3.5 w-3.5 text-success animate-pulse" />
          <span>متّصل لحظيًا — يُفصل تلقائيًا عند إخفاء التبويب</span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile icon={TrendingUp} label="مبيعات اليوم"
            value={kpi ? fmtMoney(kpi.revenue) : "—"} loading={kpiQuery.isLoading} accent="success" />
          <KpiTile icon={ShoppingBag} label="طلبات اليوم"
            value={kpi ? String(kpi.count) : "—"} loading={kpiQuery.isLoading} accent="info" />
          <KpiTile icon={Activity} label="طلبات نشطة"
            value={kpi ? String(kpi.active) : "—"} loading={kpiQuery.isLoading} accent="accent" />
          <KpiTile icon={Receipt} label="متوسط قيمة الطلب"
            value={kpi ? fmtMoney(kpi.aov) : "—"} loading={kpiQuery.isLoading} accent="primary" />
        </div>

        {/* Critical orders */}
        <section className="bg-surface rounded-2xl border border-border/40 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" />
              <h2 className="text-sm font-semibold">الطلبات الحرجة</h2>
            </div>
            <span className="text-[11px] text-foreground-tertiary">{critical.length} طلب</span>
          </header>
          {criticalQuery.isLoading ? (
            <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-5 w-5" /></div>
          ) : !critical.length ? (
            <div className="p-8 text-center text-sm text-foreground-secondary">لا طلبات نشطة الآن — راحة 🎉</div>
          ) : (
            <ul className="divide-y divide-border/30">
              {critical.map((o) => (
                <li key={o.id}>
                  <Link to="/admin/orders/$orderId" params={{ orderId: o.id }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${statusCls[o.status] ?? "bg-muted"}`}>
                      {statusLabel[o.status] ?? o.status}
                    </span>
                    <span className="text-xs text-foreground-tertiary tabular-nums shrink-0">
                      #{o.id.slice(0, 8)}
                    </span>
                    <span className="flex-1 text-xs text-foreground-secondary truncate">
                      {new Date(o.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {fmtMoney(Number(o.total_amount ?? 0))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Low stock */}
        <section className="bg-surface rounded-2xl border border-border/40 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent))]" />
              <h2 className="text-sm font-semibold">تنبيهات المخزون (≤ 10 وحدات)</h2>
            </div>
            <Link to="/admin/low-stock" className="text-[11px] text-primary">عرض الكل ←</Link>
          </header>
          {lowStockQuery.isLoading ? (
            <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-5 w-5" /></div>
          ) : !lowStock.length ? (
            <div className="p-8 text-center text-sm text-foreground-secondary">المخزون بحالة جيدة 👌</div>
          ) : (
            <ul className="divide-y divide-border/30">
              {lowStock.map((r) => {
                const critical = r.count <= 0;
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${critical ? "text-destructive" : "text-[hsl(var(--accent))]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{r.name}</p>
                      <p className="text-[10px] text-foreground-tertiary truncate">
                        {r.location_code ?? "—"} • تحديث {new Date(r.updated_at).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                    <div className={`text-center shrink-0 ${critical ? "text-destructive" : "text-[hsl(var(--accent))]"}`}>
                      <div className="font-display text-base tabular-nums">{r.count}</div>
                      <div className="text-[10px]">{critical ? "نفد" : "متبقي"}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function KpiTile({
  icon: Icon, label, value, loading, accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  loading?: boolean;
  accent: "success" | "info" | "accent" | "primary";
}) {
  const tone = {
    success: "text-success bg-success/10",
    info: "text-info bg-info/10",
    accent: "text-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10",
    primary: "text-primary bg-primary/10",
  }[accent];
  return (
    <div className="bg-surface rounded-2xl border border-border/40 p-3.5 flex items-start gap-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground-tertiary">{label}</p>
        <p className="text-base font-display tabular-nums truncate">
          {loading ? "…" : value}
        </p>
      </div>
    </div>
  );
}
