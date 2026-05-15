/**
 * SovereignSettlementsPanel — Phase 10.4 / patched in Phase 11.1
 * Reads `salsabil_vendor_settlements` (RLS-scoped to current vendor members)
 * and surfaces gross / fee / net metrics + line items.
 *
 * Phase 11.1 additions:
 *  - settlement date column (formatted via `fmtDate`)
 *  - status filter tabs: All / Pending / Cleared
 */
import { useEffect, useMemo, useState } from "react";
import { VendorGateway } from "@/core/vendor/gateway/VendorGateway";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Loader2, TrendingUp, Receipt, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  vendor_id: string;
  node_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending_clearance: "قيد التسوية",
  cleared: "تم التحويل",
  reversed: "مرتجع",
};

type FilterKey = "all" | "pending_clearance" | "cleared";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending_clearance", label: "قيد التسوية" },
  { key: "cleared", label: "تم التحويل" },
];

export function SovereignSettlementsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    VendorGateway.listVendorSettlements<Row>().then((data) => setRows(data));
  }, []);

  const visible = useMemo(() => {
    const r = rows ?? [];
    if (filter === "all") return r;
    return r.filter((x) => x.status === filter);
  }, [rows, filter]);

  const totals = useMemo(() => {
    const r = rows ?? [];
    return {
      gross: r.reduce((s, x) => s + Number(x.gross_amount ?? 0), 0),
      fee: r.reduce((s, x) => s + Number(x.platform_fee ?? 0), 0),
      net: r.reduce((s, x) => s + Number(x.net_amount ?? 0), 0),
    };
  }, [rows]);

  if (!rows) {
    return (
      <div className="py-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-display text-[16px]">محرّك التسوية السيادي</h2>

      <div className="grid grid-cols-3 gap-2">
        <IOSCard className="!p-3">
          <TrendingUp className="h-4 w-4 text-primary mb-1" />
          <p className="text-[10.5px] text-foreground-tertiary">إجمالي المبيعات</p>
          <p className="font-display num text-[15px]">{fmtMoney(totals.gross)}</p>
        </IOSCard>
        <IOSCard className="!p-3">
          <Receipt className="h-4 w-4 text-warning mb-1" />
          <p className="text-[10.5px] text-foreground-tertiary">عمولة المنصة</p>
          <p className="font-display num text-[15px]">{fmtMoney(totals.fee)}</p>
        </IOSCard>
        <IOSCard className="!p-3">
          <PiggyBank className="h-4 w-4 text-success mb-1" />
          <p className="text-[10.5px] text-foreground-tertiary">صافي الأرباح</p>
          <p className="font-display num text-[15px]">{fmtMoney(totals.net)}</p>
        </IOSCard>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 p-1 bg-surface-secondary rounded-xl">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-1.5 text-[12px] rounded-lg transition-colors ${
              filter === f.key
                ? "bg-background text-foreground font-semibold shadow-sm"
                : "text-foreground-tertiary"
            }`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <IOSCard className="text-center text-foreground-tertiary text-[13px] py-8">
          {rows.length === 0
            ? "لا توجد تسويات بعد. ستظهر هنا فور تأكيد تسليم أول طلب."
            : "لا توجد تسويات في هذه الفئة."}
        </IOSCard>
      ) : (
        <IOSCard className="!p-0 overflow-hidden">
          <div className="grid grid-cols-12 px-3 py-2 text-[10.5px] font-bold text-foreground-tertiary border-b border-border/50">
            <span className="col-span-3">الطلب</span>
            <span className="col-span-3">التاريخ</span>
            <span className="col-span-2 text-left">الإجمالي</span>
            <span className="col-span-2 text-left">العمولة</span>
            <span className="col-span-2 text-left">الصافي</span>
          </div>
          {visible.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 px-3 py-2 text-[12px] border-b border-border/30 last:border-0 items-center"
            >
              <span className="col-span-3 font-mono truncate">#{r.node_id.slice(0, 8)}</span>
              <span className="col-span-3 text-[10.5px] text-foreground-secondary">
                {fmtDate(r.created_at)}
              </span>
              <span className="col-span-2 text-left num">{fmtMoney(r.gross_amount)}</span>
              <span className="col-span-2 text-left num text-warning">−{fmtMoney(r.platform_fee)}</span>
              <span className="col-span-2 text-left num font-bold text-success">
                {fmtMoney(r.net_amount)}
                <span className="block text-[9.5px] font-normal text-foreground-tertiary">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </span>
            </div>
          ))}
        </IOSCard>
      )}
    </div>
  );
}
