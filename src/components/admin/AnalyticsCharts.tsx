import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const RevenueAreaChart = lazy(() =>
  import("@/components/admin/PremiumCharts").then((m) => ({ default: m.RevenueAreaChart })),
);
const StatusPieChart = lazy(() =>
  import("@/components/admin/PremiumCharts").then((m) => ({ default: m.StatusPieChart })),
);

type Row = { total: number | null; status: string; created_at: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار", confirmed: "مؤكَّد", preparing: "تجهيز", ready: "جاهز",
  out_for_delivery: "في الطريق", delivered: "مُسلَّم", cancelled: "ملغي",
};

export default function AnalyticsCharts() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("orders")
        .select("total,status,created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
        .limit(2000);
      if (!cancel) setRows((data ?? []) as Row[]);
    })();
    return () => { cancel = true; };
  }, []);

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
