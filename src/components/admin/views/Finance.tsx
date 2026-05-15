/**
 * Sovereign Financial Ledger — WAVE UI-13 (Steel Glass overhaul).
 *
 * Re-skins the legacy FinanceDashboard onto the Glass Arsenal:
 *   • SectionHeader + GlassKpiCard tiles for live totals.
 *   • GlassTable for partner-ledger entries with credit/debit badges.
 *   • GlassDialog showing the double-entry detail (Source → Destination).
 *
 * Data fidelity: zero new fetching. We reuse the existing server functions
 * (getFinanceOverviewFn, listPartnerLedgersFn, markPartnerLedgerPaidFn) and
 * route every read through React Query.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { GlassKpiCard } from "@/components/admin/ui/GlassKpiCard";
import {
  GlassTable,
  type GlassTableColumn,
} from "@/components/admin/ui/GlassTable";
import { GlassEmptyState } from "@/components/admin/ui/GlassEmptyState";
import { GlassDialog, GlassDialogClose } from "@/components/admin/ui/GlassDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getFinanceOverviewFn,
  listPartnerLedgersFn,
  markPartnerLedgerPaidFn,
  type PartnerLedgerRow,
} from "@/core/finance/finance.functions";

type LedgerKind = "credit" | "debit";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Treat cleared ledgers (paid) as Credit (دائن) and open ones as Debit (مدين). */
const classify = (row: PartnerLedgerRow): LedgerKind =>
  row.status === "paid" ? "credit" : "debit";

export default function FinanceDashboard() {
  const qc = useQueryClient();
  const [active, setActive] = useState<PartnerLedgerRow | null>(null);

  const overview = useQuery({
    queryKey: ["admin", "finance", "overview"],
    queryFn: () => getFinanceOverviewFn(),
    staleTime: 30_000,
  });

  const ledgers = useQuery({
    queryKey: ["admin", "finance", "partner-ledgers"],
    queryFn: () => listPartnerLedgersFn(),
    staleTime: 15_000,
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => markPartnerLedgerPaidFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "finance", "partner-ledgers"] });
      qc.invalidateQueries({ queryKey: ["admin", "finance", "overview"] });
      setActive(null);
    },
  });

  const m = overview.data;

  const totals = useMemo(() => {
    const rows = ledgers.data ?? [];
    const pending = rows.filter((r) => r.status !== "paid");
    const pendingTotal = pending.reduce(
      (s, r) => s + Number(r.amount_due ?? 0),
      0,
    );
    return { pending: pending.length, pendingTotal, count: rows.length };
  }, [ledgers.data]);

  const columns: GlassTableColumn<PartnerLedgerRow>[] = [
    {
      id: "id",
      header: "رقم القيد",
      width: "w-32",
      cell: (r) => (
        <span className="font-mono text-[11.5px] text-foreground/70">
          #{r.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: "date",
      header: "التاريخ",
      cell: (r) => (
        <span className="text-[12.5px] text-foreground/80">
          {fmtDate(r.created_at)}
        </span>
      ),
    },
    {
      id: "entity",
      header: "الكيان",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{r.partner_name}</p>
          {r.product_name ? (
            <p className="truncate text-[11px] text-foreground/55">
              {r.product_name}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "type",
      header: "النوع",
      align: "center",
      hideOnMobile: true,
      cell: (r) => {
        const kind = classify(r);
        return kind === "credit" ? (
          <Badge className="rounded-full border border-emerald-200/60 bg-emerald-500/15 text-[10.5px] font-extrabold text-emerald-700 hover:bg-emerald-500/20">
            <ArrowUpRight className="me-1 h-3 w-3" strokeWidth={2.6} />
            دائن
          </Badge>
        ) : (
          <Badge className="rounded-full border border-rose-200/60 bg-rose-500/15 text-[10.5px] font-extrabold text-rose-700 hover:bg-rose-500/20">
            <ArrowDownLeft className="me-1 h-3 w-3" strokeWidth={2.6} />
            مدين
          </Badge>
        );
      },
    },
    {
      id: "amount",
      header: "المبلغ",
      align: "end",
      cell: (r) => (
        <span
          className={cn(
            "font-display text-[14px] font-extrabold tabular-nums",
            classify(r) === "credit" ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {fmtMoney(Number(r.amount_due ?? 0))}
        </span>
      ),
    },
  ];

  return (
    <>
      <MobileTopbar title="السجل المالي السيادي" />

      <div className="bg-mesh min-h-screen px-4 pb-12 pt-3 lg:px-6 lg:pt-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <SectionHeader
            eyebrow="LEDGER · DOUBLE ENTRY"
            title="السجل المالي السيادي"
            description="دفتر القيود المزدوجة لريف المدينة — تدفقات مباشرة بين الكيانات السيادية والشركاء."
          />

          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
            <GlassKpiCard
              label="إيرادات 30 يوماً"
              value={fmtMoney(m?.revenue30d ?? 0)}
              icon={TrendingUp}
              accent="success"
              hint={`اليوم: ${fmtMoney(m?.revenueToday ?? 0)}`}
              loading={overview.isLoading}
            />
            <GlassKpiCard
              label="مستحقات الشركاء"
              value={fmtMoney(totals.pendingTotal)}
              icon={Wallet}
              accent="warning"
              hint={`${totals.pending} قيد قيد التسوية`}
              loading={ledgers.isLoading}
            />
            <GlassKpiCard
              label="ديون الموردين"
              value={fmtMoney(m?.suppliersDebt ?? 0)}
              icon={AlertTriangle}
              accent="accent"
              hint={`${m?.overdueSuppliersCount ?? 0} فاتورة متأخرة`}
              loading={overview.isLoading}
            />
            <GlassKpiCard
              label="صافي تقريبي"
              value={fmtMoney(m?.netRoughProfit ?? 0)}
              icon={Receipt}
              accent={
                (m?.netRoughProfit ?? 0) >= 0 ? "primary" : "warning"
              }
              hint={`مصروفات: ${fmtMoney(m?.expenses30d ?? 0)}`}
              loading={overview.isLoading}
            />
          </div>

          {/* Ledger entries */}
          <section className="space-y-3">
            <SectionHeader
              as="h3"
              title="قيود السجل"
              description="انقر على أي قيد لاستعراض القيد المزدوج (مصدر ↔ وجهة)."
            />

            <GlassTable<PartnerLedgerRow>
              data={ledgers.data ?? []}
              columns={columns}
              rowKey={(r) => r.id}
              loading={ledgers.isLoading}
              loadingRows={6}
              onRowClick={(r) => setActive(r)}
              emptyState={
                <GlassEmptyState
                  icon={Receipt}
                  accent="info"
                  title="لا توجد قيود حالياً"
                  description="السجل نظيف — جميع القيود المالية مغلقة. ستظهر هنا أي حركة جديدة فور تسجيلها."
                />
              }
            />
          </section>
        </div>
      </div>

      {/* Double-entry detail dialog */}
      <GlassDialog
        open={!!active}
        onOpenChange={(open) => !open && setActive(null)}
        eyebrow={active ? `قيد #${active.id.slice(0, 8)}` : undefined}
        title="تفاصيل القيد المزدوج"
        description={active ? fmtDate(active.created_at) : undefined}
        size="max-w-xl"
        footer={
          <>
            <GlassDialogClose asChild>
              <Button
                variant="ghost"
                className="rounded-2xl bg-white/40 text-[12.5px] font-semibold backdrop-blur-md hover:bg-white/60"
              >
                إغلاق
              </Button>
            </GlassDialogClose>
            {active && active.status !== "paid" ? (
              <Button
                onClick={() => markPaid.mutate(active.id)}
                disabled={markPaid.isPending}
                className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-[12.5px] font-extrabold text-white shadow-elevated hover:opacity-95"
              >
                {markPaid.isPending ? "جارٍ التسوية…" : "تسوية القيد"}
              </Button>
            ) : null}
          </>
        }
      >
        {active ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DoubleEntryNode
                role="source"
                label="من حساب"
                title="خزينة ريف المدينة"
                hint="المصدر السيادي للتسوية"
              />
              <DoubleEntryNode
                role="destination"
                label="إلى حساب"
                title={active.partner_name}
                hint={active.product_name ?? "شريك تشغيلي"}
              />
            </div>

            <dl className="glass-steel rounded-2xl border border-white/40 p-4 text-[12.5px]">
              <Row label="نوع القسمة" value={active.split_type} />
              <Row label="النسبة" value={`${active.percentage}%`} />
              <Row
                label="الحالة"
                value={
                  <Badge
                    className={cn(
                      "rounded-full text-[10.5px] font-extrabold",
                      active.status === "paid"
                        ? "border border-emerald-200/60 bg-emerald-500/15 text-emerald-700"
                        : "border border-amber-200/60 bg-amber-500/15 text-amber-700",
                    )}
                  >
                    {active.status === "paid" ? "مُسوَّى" : "معلق"}
                  </Badge>
                }
              />
              <Row
                label="المبلغ"
                value={
                  <span className="font-display text-[15px] font-extrabold tabular-nums text-foreground">
                    {fmtMoney(Number(active.amount_due ?? 0))}
                  </span>
                }
                last
              />
            </dl>
          </div>
        ) : null}
      </GlassDialog>
    </>
  );
}

function DoubleEntryNode({
  role,
  label,
  title,
  hint,
}: {
  role: "source" | "destination";
  label: string;
  title: string;
  hint?: string;
}) {
  const Icon = role === "source" ? ArrowUpRight : ArrowDownLeft;
  const tone =
    role === "source"
      ? "from-sky-400/30 to-sky-400/5 text-sky-700"
      : "from-violet-400/30 to-violet-400/5 text-violet-700";
  return (
    <div className="glass-steel rounded-2xl border border-white/40 p-4">
      <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br",
            tone,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.6} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[14px] font-extrabold">
            {title}
          </p>
          {hint ? (
            <p className="truncate text-[11.5px] text-foreground/60">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2",
        !last && "border-b border-white/40",
      )}
    >
      <dt className="text-[11.5px] font-semibold text-foreground/60">{label}</dt>
      <dd className="text-[12.5px] font-semibold text-foreground/90">{value}</dd>
    </div>
  );
}
