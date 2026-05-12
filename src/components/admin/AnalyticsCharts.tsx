/**
 * AnalyticsCharts — Sovereign Matrix Edition (Wave R-2 · Batch A.2).
 *
 * Pure presentation. All data flows through `getAnalyticsChartsDataFn`.
 */
import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsChartsDataFn } from "@/lib/analytics.functions";

const RevenueAreaChart = lazy(() =>
  import("@/components/admin/PremiumCharts").then((m) => ({ default: m.RevenueAreaChart })),
);
const StatusPieChart = lazy(() =>
  import("@/components/admin/PremiumCharts").then((m) => ({ default: m.StatusPieChart })),
);

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار", confirmed: "مؤكَّد", preparing: "تجهيز", ready: "جاهز",
  assigned: "مُسند", picked_up: "تم الالتقاط",
  out_for_delivery: "في الطريق", delivered: "مُسلَّم", cancelled: "ملغي", paid: "مدفوع",
};

export default function AnalyticsCharts() {
  const fetchCharts = useServerFn(getAnalyticsChartsDataFn);
  const { data: rows } = useQuery({
    queryKey: ["admin", "analytics-charts", 14],
    queryFn: () => fetchCharts({ data: { days: 14 } }),
    staleTime: 60_000,
  });

  const series = useMemo(() => {
    if (!rows) return [];
    const days: number[] = Array(14).fill(0);
    const start = new Date(); start.setDate(start.getDate() - 13); start.setHours(0, 0, 0, 0);
    for (const r of rows) {
      const idx = Math.floor((new Date(r.created_at).getTime() - start.getTime()) / 86400000);
      if (idx >= 0 && idx < 14) days[idx] += Number(r.total ?? 0);
    }
    return days.map((value, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      return { label: d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }), value };
    });
  }, [rows]);

  const statusData = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return [...map.entries()].map(([k, v]) => ({ label: STATUS_LABEL[k] ?? k, value: v }));
  }, [rows]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 px-4 lg:px-6 max-w-[1400px] mx-auto">
      <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 p-4 shadow-soft">
        <p className="text-[12px] text-foreground-tertiary mb-2">إيرادات آخر 14 يوماً</p>
        {!rows ? <Skeleton className="h-[220px] w-full rounded-2xl" /> : (
          <Suspense fallback={<Skeleton className="h-[220px] w-full rounded-2xl" />}>
            <RevenueAreaChart data={series} height={220} />
          </Suspense>
        )}
      </div>
      <div className="bg-card rounded-3xl border border-border/50 p-4 shadow-soft">
        <p className="text-[12px] text-foreground-tertiary mb-2">توزيع الحالات</p>
        {!rows ? <Skeleton className="h-[220px] w-full rounded-2xl" /> : (
          <Suspense fallback={<Skeleton className="h-[220px] w-full rounded-2xl" />}>
            <StatusPieChart data={statusData} height={220} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
