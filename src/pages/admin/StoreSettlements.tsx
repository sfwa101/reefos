import { CalendarRange, CircleDollarSign, PiggyBank, Receipt } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum } from "@/lib/format";

interface StoreSettlementRow {
  id: string;
  store_id: string | null;
  period_start: string | null;
  period_end: string | null;
  gross_sales: number | null;
  commission_pct: number | null;
  commission_amount: number | null;
  net_payout: number | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
}

const STATUS_TONE: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  approved: "bg-info/10 text-info",
  rejected: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "مدفوع",
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

export default function StoreSettlements() {
  return (
    <UniversalAdminGrid<StoreSettlementRow>
      title="تسويات الفروع"
      subtitle="فترات التسوية ومستحقات الفروع الصافية"
      dataSource={{
        table: "store_settlements",
        select:
          "id,store_id,period_start,period_end,gross_sales,commission_pct,commission_amount,net_payout,status,paid_at,created_at",
        orderBy: { column: "period_end", ascending: false },
        limit: 200,
        searchKeys: ["id", "status"],
      }}
      metrics={[
        {
          key: "gross",
          label: "إجمالي المبيعات",
          icon: CircleDollarSign,
          tone: "primary",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + (r.gross_sales ?? 0), 0)),
        },
        {
          key: "net",
          label: "صافي المستحق",
          icon: PiggyBank,
          tone: "success",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + (r.net_payout ?? 0), 0)),
        },
        {
          key: "commission",
          label: "إجمالي العمولات",
          icon: Receipt,
          tone: "info",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + (r.commission_amount ?? 0), 0)),
        },
        {
          key: "pending",
          label: "بانتظار الدفع",
          icon: CalendarRange,
          tone: "warning",
          compute: (rows) => fmtNum(rows.filter((r) => r.status !== "paid").length),
          urgent: (rows) => rows.some((r) => r.status === "pending"),
        },
      ]}
      columns={[
        {
          key: "period",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate num">
                {r.period_start ?? "—"} → {r.period_end ?? "—"}
              </p>
              <p className="text-[11px] text-foreground-tertiary truncate">
                عمولة {fmtNum(r.commission_pct ?? 0)}% • {fmtMoney(r.commission_amount ?? 0)}
              </p>
            </div>
          ),
        },
        {
          key: "amounts",
          className: "shrink-0 text-left",
          render: (r) => (
            <div>
              <p className="font-display text-[14px] num">{fmtMoney(r.net_payout ?? 0)}</p>
              <p className="text-[10.5px] text-foreground-tertiary num">من {fmtMoney(r.gross_sales ?? 0)}</p>
            </div>
          ),
        },
        {
          key: "status",
          className: "shrink-0",
          render: (r) => {
            const tone = STATUS_TONE[r.status ?? ""] ?? "bg-muted text-foreground-secondary";
            const label = STATUS_LABEL[r.status ?? ""] ?? (r.status ?? "—");
            return (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone}`}>
                {label}
              </span>
            );
          },
        },
      ]}
      empty={{ title: "لا توجد تسويات", hint: "ستظهر فترات التسوية الجديدة هنا." }}
    />
  );
}
