import { useEffect, useState } from "react";
import { getExecutiveDashboardStatsFn } from "@/core/finance/finance.functions";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { Loader2, TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Stats = {
  period_days: number;
  orders_count: number;
  gross_sales: number;
  items_revenue: number;
  items_cost: number;
  net_profit: number;
  profit_margin_pct: number;
  top_categories: { category: string; revenue: number; units: number }[];
  low_stock_count: number;
};

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n || 0);

export default function ExecutiveDashboard() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("store_manager") || hasRole("finance");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (rolesLoading || !allowed) return;
    let cancelled = false;
    setLoading(true);
    getExecutiveDashboardStatsFn({ data: { days } })
      .then((data) => { if (!cancelled && data) setStats(data as Stats); })
      .catch(() => { /* admin-gated; ignore */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, allowed, rolesLoading]);

  if (rolesLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!allowed) return <div className="p-8 text-center text-destructive">للأدمن أو المدير أو المالية فقط</div>;

  return (
    <>
      <MobileTopbar title="اللوحة التنفيذية" />
      <div className="px-4 lg:px-6 pt-3 pb-6 max-w-4xl mx-auto space-y-4">
        {/* Period switcher */}
        <div className="flex gap-2 bg-surface rounded-xl p-1 border border-border/40">
          {[7, 30, 90].map(d => (
            <Button key={d} onClick={() => setDays(d)}
              className={`flex-1 h-8 rounded-lg text-sm font-medium transition ${days === d ? "bg-primary text-primary-foreground" : "text-foreground-secondary"}`}>
              آخر {d} يوم
            </Button>
          ))}
        </div>

        {loading || !stats ? (
          <div className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard icon={ShoppingCart} label="عدد الطلبات" value={fmt(stats.orders_count)} accent="from-[hsl(var(--info))] to-[hsl(var(--indigo))]" />
              <KpiCard icon={DollarSign} label="إجمالي المبيعات" value={`${fmt(stats.gross_sales)} ج.م`} accent="from-primary to-primary-glow" />
              <KpiCard icon={TrendingUp} label="صافي الربح المُقدّر" value={`${fmt(stats.net_profit)} ج.م`} accent="from-[hsl(var(--success))] to-[hsl(var(--teal))]" />
              <KpiCard icon={TrendingUp} label="هامش الربح" value={`${stats.profit_margin_pct}%`} accent="from-[hsl(var(--purple))] to-[hsl(var(--pink))]" />
            </div>

            {/* Low stock alert */}
            {stats.low_stock_count > 0 && (
              <Link to="/admin/low-stock" className="block">
                <div className="bg-gradient-to-br from-[hsl(var(--accent))]/15 to-[hsl(20_100%_55%)]/15 border border-[hsl(var(--accent))]/40 rounded-2xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[hsl(var(--accent))] text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm">تنبيه: مخزون منخفض</p>
                    <p className="text-xs text-foreground-secondary">{stats.low_stock_count} منتج وصل للحد الحرج</p>
                  </div>
                  <Button size="sm" variant="outline">عرض</Button>
                </div>
              </Link>
            )}

            {/* Top categories */}
            <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-3">
              <h3 className="font-display text-base">أعلى الفئات مبيعاً</h3>
              <div className="space-y-2">
                {(stats.top_categories ?? []).map((c, i) => {
                  const max = Math.max(...(stats.top_categories ?? []).map(x => x.revenue), 1);
                  const pct = (c.revenue / max) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{c.category}</span>
                        <span className="text-foreground-tertiary">{fmt(c.revenue)} ج.م • {c.units} قطعة</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-l from-primary to-primary-glow rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!(stats.top_categories ?? []).length && <p className="text-center text-foreground-tertiary text-sm py-4">لا توجد بيانات</p>}
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-2">
              <h3 className="font-display text-base mb-2">تحليل الربحية</h3>
              <Row label="إيرادات المنتجات" value={`${fmt(stats.items_revenue)} ج.م`} />
              <Row label="تكلفة المنتجات" value={`${fmt(stats.items_cost)} ج.م`} muted />
              <div className="border-t border-border/40 my-2" />
              <Row label="صافي الربح" value={`${fmt(stats.net_profit)} ج.م`} bold />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border/40">
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white mb-2`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </div>
      <p className="text-[11px] text-foreground-tertiary">{label}</p>
      <p className="font-display text-[18px] mt-0.5">{value}</p>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-foreground-tertiary" : ""} ${bold ? "font-display text-base text-primary" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
