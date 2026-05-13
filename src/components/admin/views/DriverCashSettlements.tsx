import { Banknote, FileCheck, HandCoins, Users } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";

interface DriverCashSettlementRow {
  id: string;
  driver_id: string | null;
  amount: number | null;
  kind: string | null;
  received_by: string | null;
  received_by_name: string | null;
  bank_reference: string | null;
  notes: string | null;
  created_at: string | null;
}

const KIND_LABEL: Record<string, string> = {
  cash_handover: "تسليم كاش",
  commission_payout: "صرف عمولة",
};

export default function DriverCashSettlements() {
  return (
    <UniversalAdminGrid<DriverCashSettlementRow>
      title="سجل تسويات المناديب"
      subtitle="كل عمليات تسليم العهدة وصرف العمولات بشفافية"
      dataSource={{
        table: "driver_cash_settlements",
        select: "id,driver_id,amount,kind,received_by,received_by_name,bank_reference,notes,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 300,
        searchKeys: ["bank_reference", "received_by_name", "notes"],
      }}
      metrics={[
        {
          key: "total",
          label: "إجمالي التسويات",
          icon: HandCoins,
          tone: "primary",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + (r.amount ?? 0), 0)),
        },
        {
          key: "cash",
          label: "تسليمات كاش",
          icon: Banknote,
          tone: "success",
          compute: (rows) =>
            fmtMoney(rows.filter((r) => r.kind === "cash_handover").reduce((s, r) => s + (r.amount ?? 0), 0)),
        },
        {
          key: "commission",
          label: "عمولات مصروفة",
          icon: FileCheck,
          tone: "info",
          compute: (rows) =>
            fmtMoney(rows.filter((r) => r.kind === "commission_payout").reduce((s, r) => s + (r.amount ?? 0), 0)),
        },
        {
          key: "count",
          label: "عدد العمليات",
          icon: Users,
          tone: "indigo",
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
                {KIND_LABEL[r.kind ?? ""] ?? r.kind ?? "—"}
              </p>
              <p className="text-[11px] text-foreground-tertiary truncate">
                {r.received_by_name ?? "—"}
                {r.bank_reference ? ` • مرجع: ${r.bank_reference}` : ""}
              </p>
            </div>
          ),
        },
        {
          key: "amount",
          className: "shrink-0 text-left",
          render: (r) => (
            <div>
              <p className="font-display text-[14px] num">{fmtMoney(r.amount ?? 0)}</p>
              <p className="text-[10.5px] text-foreground-tertiary">{fmtRelative(r.created_at ?? "")}</p>
            </div>
          ),
        },
      ]}
      empty={{ title: "لا توجد تسويات بعد", hint: "كل عملية تسليم عهدة ستظهر هنا تلقائياً." }}
    />
  );
}
