import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Wallet, Receipt, AlertTriangle, CheckCircle2, ChevronLeft, Calendar } from "lucide-react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { HakimPulseBanner } from "@/components/admin/HakimPulseBanner";
import { HakimChatDrawer } from "@/components/admin/HakimChatDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtMoney, fmtNum } from "@/lib/format";
import { getFinanceOverviewFn, type FinanceOverview, type FinanceTopSupplier } from "@/core/finance/finance.functions";
import { cn } from "@/lib/utils";

export default function FinanceDashboard() {
  const [m, setM] = useState<Omit<FinanceOverview, "topSuppliers"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [topSuppliers, setTopSuppliers] = useState<FinanceTopSupplier[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const out = await getFinanceOverviewFn();
        if (!alive) return;
        const { topSuppliers: ts, ...rest } = out;
        setM(rest);
        setTopSuppliers(ts);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Frozen metrics passed to Hakim — only update when loading completes
  const pulseMetrics = useMemo(() => m ?? {}, [m]);

  return (
    <>
      <MobileTopbar title="مركز القيادة المالي" />

      <div className="hidden lg:flex items-end justify-between px-6 pt-8 pb-3 max-w-[1400px] mx-auto">
        <div>
          <p className="text-sm text-foreground-secondary flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> آخر 30 يوماً
          </p>
          <h1 className="font-display text-[30px] tracking-tight mt-0.5">المالية والأداء</h1>
        </div>
      </div>

      <div className="px-4 lg:px-6 pt-3 pb-10 max-w-[1400px] mx-auto space-y-5">
        {/* 1. Hakim's Pulse — AI-powered live insight */}
        {!loading && m && (
          <HakimPulseBanner metrics={pulseMetrics} page="finance" onChat={() => setChatOpen(true)} />
        )}
        {loading && <Skeleton className="h-24 w-full rounded-3xl" />}

        {/* 2. Bento Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
          </div>
        ) : m && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
            {/* Hero: revenue */}
            <Link to="/admin/orders" className="col-span-2 xl:col-span-2 group relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-success to-[hsl(var(--teal))] text-white shadow-soft hover:shadow-elegant transition-all hover:-translate-y-0.5 press">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <p className="text-[11.5px] opacity-90">إيرادات 30 يوماً</p>
                <p className="font-display text-[26px] lg:text-[30px] num leading-tight mt-0.5">{fmtMoney(m.revenue30d)}</p>
                <p className="text-[11px] opacity-85 mt-1">اليوم: {fmtMoney(m.revenueToday)}</p>
              </div>
            </Link>

            <FinanceTile icon={CheckCircle2} label="طلبات مكتملة" value={fmtNum(m.ordersCompleted)} tone="from-primary to-primary-glow" sub={`اليوم: ${fmtNum(m.ordersToday)}`} />
            <FinanceTile icon={Wallet} label="ديون الموردين" value={fmtMoney(m.suppliersDebt)} tone="from-[hsl(var(--accent))] to-[hsl(20_100%_55%)]" urgent={m.suppliersDebt > 0} />
            <FinanceTile icon={AlertTriangle} label="فواتير متأخرة" value={fmtNum(m.overdueSuppliersCount)} tone="from-destructive to-[hsl(0_75%_55%)]" urgent={m.overdueSuppliersCount > 0} />
            <FinanceTile icon={Receipt} label="مصروفات 30 يوماً" value={fmtMoney(m.expenses30d)} tone="from-[hsl(var(--purple))] to-[hsl(var(--pink))]" />
            <FinanceTile
              icon={m.netRoughProfit >= 0 ? TrendingUp : TrendingDown}
              label="صافي تقريبي"
              value={fmtMoney(m.netRoughProfit)}
              tone={m.netRoughProfit >= 0 ? "from-[hsl(var(--success))] to-[hsl(var(--teal))]" : "from-destructive to-[hsl(0_75%_55%)]"}
            />
          </div>
        )}

        {/* 3. Top suppliers debt */}
        <section className="bg-surface rounded-3xl border border-border/50 shadow-soft overflow-hidden">
          <div className="px-4 lg:px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[hsl(var(--accent))]" />
              <h2 className="font-display text-[16px]">أكبر ديون الموردين</h2>
            </div>
            <Link to="/admin/suppliers" className="text-[12px] text-primary hover:underline flex items-center gap-0.5">
              الكل <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
          ) : topSuppliers.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-foreground-tertiary">لا توجد مديونيات حالياً 🎉</div>
          ) : (
            <div className="divide-y divide-border/40">
              {topSuppliers.map((s) => (
                <div key={s.id} className="px-4 lg:px-5 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] flex items-center justify-center shrink-0">
                    <Wallet className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium truncate">{s.name}</p>
                    <p className="text-[11px] text-foreground-tertiary">آجل {s.payment_terms_days ?? 30} يوم</p>
                  </div>
                  <p className="text-[14px] font-display num shrink-0 text-[hsl(var(--accent))]">{fmtMoney(s.outstanding_balance)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 4. Hakim chat drawer */}
      <HakimChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        contextLabel="الأرقام المالية الحية لآخر 30 يوماً"
        contextData={pulseMetrics}
      />
    </>
  );
}

function FinanceTile({
  icon: Icon, label, value, tone, sub, urgent,
}: { icon: React.ElementType; label: string; value: string; tone: string; sub?: string; urgent?: boolean }) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-3xl p-4 bg-card border shadow-soft hover:shadow-tile transition-all hover:-translate-y-0.5",
      urgent ? "border-[hsl(var(--accent))]/40" : "border-border/50",
    )}>
      <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-3 shadow-sm", tone)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </div>
      <p className="text-[11px] text-foreground-tertiary leading-tight">{label}</p>
      <p className="font-display text-[20px] num leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-[10.5px] text-foreground-tertiary mt-0.5">{sub}</p>}
      {urgent && <span className="absolute top-3 left-3 h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />}
    </div>
  );
}
