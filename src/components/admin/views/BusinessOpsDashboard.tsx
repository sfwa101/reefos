/**
 * BusinessOpsDashboard — WAVE UI-7 (Steel Glass OSHome).
 *
 * Sovereign command center for the admin home. Wraps the existing
 * `getOpsKpisFn` gateway with a new Apple-inspired Steel Glass UI:
 *   • Hero greeting block (glass-steel-strong)
 *   • 4 × GlassKpiCard tiles with real revenue/orders/active/AOV data
 *   • Critical-orders glass section with status pills + deep links
 *   • Low-stock glass section
 *
 * Constitution v5.1: zero supabase.from() calls, all reads via gateway,
 * graceful skeleton fallbacks when data not yet ready.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Radio,
  Receipt,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { useAdminRoles } from "@/components/admin/RoleGuard";
import { GlassKpiCard } from "@/components/admin/ui/GlassKpiCard";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getOpsKpisFn } from "@/core/ops/ops.functions";
import { workspaceQueryKey, getWorkspaceIdSync } from "@/core/identity/workspace";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار التأكيد",
  preparing: "قيد التجهيز",
  out_for_delivery: "مع المندوب",
};
const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  preparing: "bg-violet-500/15 text-violet-700",
  out_for_delivery: "bg-sky-500/15 text-sky-700",
};

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "ليلة هادئة";
  if (h < 12) return "صباح الخير";
  if (h < 17) return "نهار مبارك";
  if (h < 21) return "مساء النور";
  return "أمسية طيبة";
}

export default function BusinessOpsDashboard() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed =
    hasRole("admin") || hasRole("finance") || hasRole("store_manager");

  const opsQuery = useQuery({
    queryKey: workspaceQueryKey("admin", "ops", "snapshot"),
    enabled: allowed && getWorkspaceIdSync() !== null,
    staleTime: 10_000,
    refetchInterval: 15_000,
    queryFn: () => getOpsKpisFn(),
  });

  const kpi = opsQuery.data?.kpi;
  const critical = useMemo(() => opsQuery.data?.critical ?? [], [opsQuery.data]);
  const lowStock = useMemo(() => opsQuery.data?.lowStock ?? [], [opsQuery.data]);
  const isLoading = opsQuery.isLoading;

  if (rolesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4" dir="rtl">
        <div className="glass-steel max-w-sm rounded-3xl border border-white/40 p-6 text-center shadow-elevated">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <p className="text-sm font-bold">
            مركز القيادة متاح للأدمن / المالية / مدير المتجر فقط.
          </p>
        </div>
      </div>
    );
  }

  const greeting = greetingFor(new Date());
  const todayLabel = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 pt-2" dir="rtl">
      {/* ───────── Hero greeting ───────── */}
      <section className="glass-steel-strong relative overflow-hidden rounded-3xl border border-white/50 p-5 shadow-elevated md:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary/80">
              {todayLabel}
            </p>
            <h1 className="font-display mt-1 text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {greeting}، أيها القائد.
            </h1>
            <p className="mt-2 max-w-xl text-[13px] font-medium leading-relaxed text-muted-foreground md:text-sm">
              نظرة شاملة على نبض المتجر اللحظي. كل الأرقام تأتي من النواة السيادية وتُحدَّث تلقائياً كل ١٥ ثانية.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/40 px-3 py-1 text-[11px] font-bold text-emerald-700 backdrop-blur-md">
              <Radio className="h-3 w-3 animate-pulse" />
              متّصل لحظياً
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="ghost" className="h-10 rounded-2xl border border-white/40 bg-white/40 backdrop-blur-md hover:bg-white/60">
              <Link to="/admin/orders">
                <ShoppingBag className="ms-1 h-4 w-4" />
                الطلبات
              </Link>
            </Button>
            <Button asChild className="h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elevated hover:opacity-95">
              <Link to="/admin/analytics">
                <TrendingUp className="ms-1 h-4 w-4" />
                التحليلات
              </Link>
            </Button>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-transparent blur-3xl"
        />
      </section>

      {/* ───────── KPI Grid ───────── */}
      <section>
        <SectionHeader
          eyebrow="مؤشرات اليوم"
          title="نبض المتجر"
          description="مبيعات وطلبات اليوم محسوبة من النواة، ومحدّثة لحظياً."
        />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <GlassKpiCard
            label="مبيعات اليوم"
            value={kpi ? fmtMoney(kpi.revenue) : "—"}
            icon={TrendingUp}
            accent="success"
            hint="إجمالي بعد التأكيد"
            loading={isLoading}
          />
          <GlassKpiCard
            label="طلبات اليوم"
            value={kpi ? String(kpi.count) : "—"}
            icon={ShoppingBag}
            accent="info"
            hint="جميع الحالات"
            loading={isLoading}
          />
          <GlassKpiCard
            label="طلبات نشطة"
            value={kpi ? String(kpi.active) : "—"}
            icon={Activity}
            accent="accent"
            hint="بانتظار التسليم"
            loading={isLoading}
          />
          <GlassKpiCard
            label="متوسط قيمة الطلب"
            value={kpi ? fmtMoney(kpi.aov) : "—"}
            icon={Receipt}
            accent="primary"
            hint="AOV لليوم"
            loading={isLoading}
          />
        </div>
      </section>

      {/* ───────── Two-column glass sections ───────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Critical orders */}
        <section className="glass-steel rounded-3xl border border-white/40 p-4 shadow-elevated md:p-6">
          <SectionHeader
            eyebrow="عمليات حرجة"
            title="الطلبات الحرجة"
            description={`${critical.length} طلب نشِط الآن.`}
            action={
              <Button asChild variant="ghost" size="sm" className="rounded-2xl bg-white/40 backdrop-blur-md hover:bg-white/60">
                <Link to="/admin/orders">
                  عرض الكل
                  <ArrowUpRight className="ms-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            ) : critical.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/50 bg-white/30 px-4 py-8 text-center text-sm font-bold text-muted-foreground">
                لا طلبات نشطة الآن — راحة 🎉
              </div>
            ) : (
              <ul className="space-y-2">
                {critical.map((o) => (
                  <li key={o.id}>
                    <Link
                      to="/admin/orders/$orderId"
                      params={{ orderId: o.id }}
                      className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/30 px-3 py-2.5 backdrop-blur-md transition hover:bg-white/60"
                    >
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                          STATUS_PILL[o.status] ?? "bg-muted text-foreground",
                        )}
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </span>
                      <span className="flex-1 truncate text-[11.5px] font-medium text-muted-foreground">
                        {new Date(o.created_at).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="font-display shrink-0 text-sm font-extrabold tabular-nums">
                        {fmtMoney(Number(o.total_amount ?? 0))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Low stock */}
        <section className="glass-steel rounded-3xl border border-white/40 p-4 shadow-elevated md:p-6">
          <SectionHeader
            eyebrow="مراقبة المخزون"
            title="تنبيهات المخزون"
            description="≤ ١٠ وحدات أو نفد المخزون."
            action={
              <Button asChild variant="ghost" size="sm" className="rounded-2xl bg-white/40 backdrop-blur-md hover:bg-white/60">
                <Link to="/admin/low-stock">
                  عرض الكل
                  <ArrowUpRight className="ms-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            ) : lowStock.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/50 bg-white/30 px-4 py-8 text-center text-sm font-bold text-muted-foreground">
                المخزون بحالة جيدة 👌
              </div>
            ) : (
              <ul className="space-y-2">
                {lowStock.map((r) => {
                  const isOut = r.count <= 0;
                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/30 px-3 py-2.5 backdrop-blur-md"
                    >
                      <AlertTriangle
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isOut ? "text-destructive" : "text-amber-600",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold">{r.name}</p>
                        <p className="truncate text-[10.5px] font-medium text-muted-foreground">
                          {r.location_code ?? "—"} · تحديث{" "}
                          {new Date(r.updated_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 text-center",
                          isOut ? "text-destructive" : "text-amber-600",
                        )}
                      >
                        <div className="font-display text-base font-extrabold tabular-nums leading-none">
                          {r.count}
                        </div>
                        <div className="text-[10px] font-bold">
                          {isOut ? "نفد" : "متبقي"}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
