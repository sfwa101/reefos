import { Coins, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";

interface AdvanceRow {
  id: string;
  user_id: string;
  branch_id: string | null;
  kind: "advance" | "petty_cash" | "reimbursement";
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "paid";
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const KIND_LABEL: Record<AdvanceRow["kind"], string> = {
  advance: "سلفة",
  petty_cash: "نثرية",
  reimbursement: "تعويض",
};

const STATUS_TONE: Record<AdvanceRow["status"], string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-info/10 text-info",
  rejected: "bg-destructive/10 text-destructive",
  paid: "bg-success/10 text-success",
};

const STATUS_LABEL: Record<AdvanceRow["status"], string> = {
  pending: "بانتظار الموافقة",
  approved: "موافق عليه",
  rejected: "مرفوض",
  paid: "مدفوع",
};

export default function StaffAdvances() {
  return (
    <UniversalAdminGrid<AdvanceRow>
      title="السلف والطلبات المالية"
      subtitle="إدارة طلبات السلف والنثرية والتعويضات للموظفين"
      dataSource={{
        table: "staff_advance_requests",
        select: "id,user_id,branch_id,kind,amount,reason,status,approved_at,rejection_reason,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 300,
        searchKeys: ["user_id", "reason"],
      }}
      metrics={[
        {
          key: "pending",
          label: "بانتظار الموافقة",
          icon: AlertTriangle,
          tone: "warning",
          compute: (rows) => fmtNum(rows.filter((r) => r.status === "pending").length),
          urgent: (rows) => rows.some((r) => r.status === "pending"),
        },
        {
          key: "pending_amount",
          label: "قيمة المعلّق",
          icon: Coins,
          tone: "accent",
          compute: (rows) =>
            fmtMoney(rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount ?? 0), 0)),
        },
        {
          key: "paid_amount",
          label: "مدفوع هذا الشهر",
          icon: CheckCircle2,
          tone: "success",
          compute: (rows) => {
            const month = new Date().getMonth();
            return fmtMoney(
              rows
                .filter((r) => r.status === "paid" && new Date(r.created_at).getMonth() === month)
                .reduce((s, r) => s + Number(r.amount ?? 0), 0),
            );
          },
        },
        {
          key: "total",
          label: "إجمالي الطلبات",
          icon: Wallet,
          tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
      ]}
      columns={[
        {
          key: "info",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate">
                {KIND_LABEL[r.kind]} • <span className="num">#{r.user_id.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-[11.5px] text-foreground-secondary truncate">{r.reason}</p>
              <p className="text-[10.5px] text-foreground-tertiary num">{fmtRelative(r.created_at)}</p>
            </div>
          ),
        },
        {
          key: "amount",
          className: "shrink-0 text-left",
          render: (r) => <p className="font-display text-[14px] num">{fmtMoney(Number(r.amount ?? 0))}</p>,
        },
        {
          key: "status",
          className: "shrink-0",
          render: (r) => (
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold " + STATUS_TONE[r.status]
              }
            >
              {STATUS_LABEL[r.status]}
            </span>
          ),
        },
      ]}
      empty={{ title: "لا توجد طلبات سلف بعد", hint: "ستظهر هنا الطلبات فور تقديمها من الموظفين." }}
    />
  );
}
