import { Coins, TrendingUp, Receipt, Star } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";

interface PartnerLedgerRow {
  id: string;
  partner_id: string;
  partner_name: string;
  product_name: string | null;
  quantity: number;
  revenue: number;
  net_profit: number;
  amount_due: number;
  split_type: string;
  percentage: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const STATUS_TONE: Record<string, string> = {
  accrued: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  accrued: "مستحق",
  paid: "مدفوع",
  cancelled: "ملغي",
};

export default function PartnerLedgers() {
  return (
    <UniversalAdminGrid<PartnerLedgerRow>
      title="حسابات شركاء المنتجات"
      subtitle="سجل توزيع الأرباح والمستحقات لشركاء التوريد"
      dataSource={{
        table: "partner_ledgers",
        select:
          "id,partner_id,partner_name,product_name,quantity,revenue,net_profit,amount_due,split_type,percentage,status,paid_at,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 300,
        searchKeys: ["partner_name", "product_name"],
      }}
      metrics={[
        {
          key: "due",
          label: "مستحقات قيد الدفع",
          icon: Coins,
          tone: "warning",
          compute: (rows) =>
            fmtMoney(rows.filter((r) => r.status === "accrued").reduce((s, r) => s + Number(r.amount_due ?? 0), 0)),
          urgent: (rows) => rows.some((r) => r.status === "accrued"),
        },
        {
          key: "revenue",
          label: "إجمالي الإيرادات",
          icon: TrendingUp,
          tone: "success",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0)),
        },
        {
          key: "profit",
          label: "صافي الأرباح",
          icon: Receipt,
          tone: "info",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + Number(r.net_profit ?? 0), 0)),
        },
        {
          key: "partners",
          label: "شركاء نشطون",
          icon: Star,
          tone: "purple",
          compute: (rows) => fmtNum(new Set(rows.map((r) => r.partner_id)).size),
        },
      ]}
      columns={[
        {
          key: "info",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate">{r.partner_name}</p>
              <p className="text-[11.5px] text-foreground-secondary truncate">{r.product_name ?? "—"}</p>
              <p className="text-[10.5px] text-foreground-tertiary num">
                {fmtRelative(r.created_at)} • {r.split_type} {Number(r.percentage)}%
              </p>
            </div>
          ),
        },
        {
          key: "revenue",
          className: "shrink-0 text-left",
          hideOnMobile: true,
          render: (r) => (
            <div>
              <p className="text-[12px] num text-foreground-secondary">إيراد {fmtMoney(Number(r.revenue ?? 0))}</p>
              <p className="text-[10.5px] num text-foreground-tertiary">×{fmtNum(r.quantity)}</p>
            </div>
          ),
        },
        {
          key: "due",
          className: "shrink-0 text-left",
          render: (r) => <p className="font-display text-[14px] num">{fmtMoney(Number(r.amount_due ?? 0))}</p>,
        },
        {
          key: "status",
          className: "shrink-0",
          render: (r) => (
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold " +
                (STATUS_TONE[r.status] ?? "bg-muted text-foreground-secondary")
              }
            >
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          ),
        },
      ]}
      empty={{ title: "لا يوجد حركة شركاء بعد", hint: "ستظهر مستحقات الشركاء بمجرد إتمام أول طلب." }}
    />
  );
}
