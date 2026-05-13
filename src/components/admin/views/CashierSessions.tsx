import { Banknote, Clock, Receipt, User } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";

interface CashierSessionRow {
  id: string;
  cashier_id: string | null;
  branch_id: string | null;
  opened_at: string | null;
  closed_at: string | null;
  opening_float: number | null;
  closing_cash: number | null;
  total_sales: number | null;
  total_orders: number | null;
  notes: string | null;
}

export default function CashierSessions() {
  return (
    <UniversalAdminGrid<CashierSessionRow>
      title="ورديات الكاشير"
      subtitle="مراقبة الجلسات المفتوحة والمغلقة على نقاط البيع"
      dataSource={{
        table: "cashier_sessions",
        select: "id,cashier_id,branch_id,opened_at,closed_at,opening_float,closing_cash,total_sales,total_orders,notes",
        orderBy: { column: "opened_at", ascending: false },
        limit: 200,
        searchKeys: ["id", "notes"],
      }}
      metrics={[
        {
          key: "open",
          label: "ورديات مفتوحة",
          icon: Clock,
          tone: "warning",
          compute: (rows) => fmtNum(rows.filter((r) => !r.closed_at).length),
          urgent: (rows) => rows.some((r) => !r.closed_at),
        },
        {
          key: "sales",
          label: "إجمالي المبيعات",
          icon: Banknote,
          tone: "success",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + (r.total_sales ?? 0), 0)),
        },
        {
          key: "orders",
          label: "عدد الطلبات",
          icon: Receipt,
          tone: "info",
          compute: (rows) => fmtNum(rows.reduce((s, r) => s + (r.total_orders ?? 0), 0)),
        },
        {
          key: "total",
          label: "إجمالي الجلسات",
          icon: User,
          tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
      ]}
      columns={[
        {
          key: "session",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate">
                #{r.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-[11px] text-foreground-tertiary num">
                فتح: {fmtRelative(r.opened_at ?? "")}
                {r.closed_at ? ` • أُغلق: ${fmtRelative(r.closed_at)}` : ""}
              </p>
            </div>
          ),
        },
        {
          key: "sales",
          className: "shrink-0 text-left",
          render: (r) => (
            <div>
              <p className="font-display text-[14px] num">{fmtMoney(r.total_sales ?? 0)}</p>
              <p className="text-[10.5px] text-foreground-tertiary num">{fmtNum(r.total_orders ?? 0)} طلب</p>
            </div>
          ),
        },
        {
          key: "status",
          className: "shrink-0",
          render: (r) => (
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold " +
                (r.closed_at
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning")
              }
            >
              {r.closed_at ? "مغلقة" : "مفتوحة"}
            </span>
          ),
        },
      ]}
      empty={{ title: "لا توجد ورديات بعد", hint: "ستظهر الجلسات بمجرد فتح أول وردية." }}
    />
  );
}
