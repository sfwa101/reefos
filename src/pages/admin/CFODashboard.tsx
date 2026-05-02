import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintReportButton } from "@/components/admin/PrintReportButton";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Loader2, ShieldAlert, TrendingDown, Wallet, Gift, Percent, AlertTriangle, BarChart3 } from "lucide-react";

const CategoryBarChart = lazy(() =>
  import("@/components/admin/PremiumCharts").then((m) => ({ default: m.CategoryBarChart })),
);

type Stats = {
  discounts_this_month: number;
  commissions_pending_vest: number;
  commissions_paid_this_month: number;
  wallet_liabilities_total: number;
  eroded_margin_products: Array<{
    id: string; name: string; category: string;
    selling_price: number; cost_price: number; packaging_cost: number;
    margin: number; margin_pct: number;
  }>;
  generated_at: string;
};

export default function CFODashboard() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance") || hasRole("store_manager");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const flowChart = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "خصومات", value: Number(stats.discounts_this_month ?? 0) },
      { label: "عمولات قيد التحرر", value: Number(stats.commissions_pending_vest ?? 0) },
      { label: "عمولات مصروفة", value: Number(stats.commissions_paid_this_month ?? 0) },
      { label: "التزامات المحافظ", value: Number(stats.wallet_liabilities_total ?? 0) },
    ];
  }, [stats]);

  useEffect(() => {
    if (!allowed) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase.rpc("cfo_dashboard_stats" as never);
      if (!error) setStats(data as unknown as Stats);
      setLoading(false);
    })();
  }, [allowed]);

  if (rolesLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!allowed) {
    return (
      <>
        <MobileTopbar title="الرؤية المالية" />
        <div className="p-8 text-center" dir="rtl">
          <ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" />
          <p className="font-display text-[16px]">متاح للمدير المالي والإدارة فقط</p>
        </div>
      </>
    );
  }

  return (
    <>
      <MobileTopbar title="الرؤية المالية (CFO)" />
      <div className="px-4 lg:px-6 pt-2 pb-6 max-w-4xl mx-auto space-y-4" dir="rtl">

        <div className="grid grid-cols-2 gap-3">
          <KPI icon={Percent} label="خصومات الشهر" value={stats?.discounts_this_month ?? 0}
               color="from-[hsl(var(--accent))] to-[hsl(20_100%_55%)]" />
          <KPI icon={Gift} label="عمولات قيد التحرر" value={stats?.commissions_pending_vest ?? 0}
               color="from-[hsl(var(--purple))] to-[hsl(var(--pink))]" subtitle="48 ساعة بعد التسليم" />
          <KPI icon={Gift} label="عمولات مصروفة (شهرياً)" value={stats?.commissions_paid_this_month ?? 0}
               color="from-[hsl(var(--success))] to-[hsl(var(--teal))]" />
          <KPI icon={Wallet} label="التزامات المحافظ" value={stats?.wallet_liabilities_total ?? 0}
               color="from-[hsl(var(--info))] to-[hsl(var(--indigo))]" subtitle="رصيد العملاء المحتجز" />
        </div>

        <div className="bg-surface rounded-2xl border border-border/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-[13.5px] font-bold">التدفقات المالية الشهرية</h3>
          </div>
          {!stats ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : (
            <Suspense fallback={<Skeleton className="h-[240px] w-full rounded-xl" />}>
              <CategoryBarChart data={flowChart} height={240} />
            </Suspense>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <h3 className="text-[13.5px] font-bold">المنتجات ذات الهامش المتآكل</h3>
            </div>
            <span className="text-[11px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
              {stats?.eroded_margin_products?.length ?? 0}
            </span>
          </div>
          {!stats?.eroded_margin_products?.length ? (
            <p className="p-6 text-center text-[13px] text-foreground-tertiary">لا توجد منتجات بهوامش متآكلة 🎉</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {stats.eroded_margin_products.map(p => (
                <li key={p.id} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-foreground-tertiary truncate">{p.category}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-bold num">{fmtMoney(p.margin)}</p>
                    <p className="text-[10.5px] text-destructive font-bold num">{p.margin_pct}%</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {stats?.generated_at && (
          <p className="text-[10.5px] text-center text-foreground-tertiary">
            آخر تحديث: {new Date(stats.generated_at).toLocaleString("ar-EG")}
          </p>
        )}
      </div>
    </>
  );
}

function KPI({ icon: Icon, label, value, color, subtitle }: {
  icon: React.ComponentType<{ className?: string }>; label: string;
  value: number; color: string; subtitle?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border/40 p-3.5 space-y-2">
      <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-foreground-tertiary leading-tight">{label}</p>
        <p className="font-display text-[18px] num leading-tight mt-0.5">{fmtMoney(value)}</p>
        {subtitle && <p className="text-[10px] text-foreground-tertiary mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
