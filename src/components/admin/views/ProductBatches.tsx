import { Layers, CalendarClock, AlertTriangle, Package } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";

type Row = {
  id: string;
  product_id: string;
  warehouse_id: string | null;
  batch_code: string | null;
  quantity: number;
  cost_per_unit: number | null;
  received_at: string;
  expires_at: string | null;
  warehouses?: { name: string | null } | null;
};

const daysUntil = (iso: string | null) => {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" }); } catch { return iso; }
};

export default function ProductBatches() {
  return (
    <UniversalAdminGrid<Row>
      title="دفعات المنتجات (FEFO)"
      subtitle="تتبع الدفعات وتواريخ الصلاحية — الأقرب انتهاءً يُصرف أولاً"
      metrics={[
        { key: "batches", label: "الدفعات", icon: Layers, tone: "primary", compute: (r) => r.length },
        { key: "qty", label: "إجمالي الكميات", icon: Package, tone: "info",
          compute: (r) => r.reduce((s, x) => s + (x.quantity ?? 0), 0) },
        { key: "soon", label: "تنتهي خلال 30 يوم", icon: CalendarClock, tone: "warning",
          compute: (r) => r.filter((x) => {
            const d = daysUntil(x.expires_at); return d !== null && d >= 0 && d <= 30;
          }).length },
        { key: "expired", label: "منتهية", icon: AlertTriangle, tone: "pink",
          compute: (r) => r.filter((x) => {
            const d = daysUntil(x.expires_at); return d !== null && d < 0;
          }).length,
          urgent: (r) => r.some((x) => { const d = daysUntil(x.expires_at); return d !== null && d < 0; }) },
      ]}
      dataSource={{
        table: "product_batches",
        select: "id,product_id,warehouse_id,batch_code,quantity,cost_per_unit,received_at,expires_at,warehouses(name)",
        orderBy: { column: "expires_at", ascending: true },
        limit: 500,
        searchKeys: ["product_id", "batch_code"],
      }}
      searchPlaceholder="بحث برقم المنتج أو رمز الدفعة..."
      columns={[
        { key: "batch", label: "الدفعة", className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[14px] truncate">{r.batch_code || r.product_id}</p>
              <p className="text-[11px] text-foreground-tertiary truncate">{r.warehouses?.name || "—"}</p>
            </div>
          )},
        { key: "qty", className: "shrink-0 w-16 text-center",
          render: (r) => <span className="num font-semibold text-[14px]">{r.quantity}</span> },
        { key: "expiry", hideOnMobile: true, className: "shrink-0 w-32 text-left",
          render: (r) => {
            const d = daysUntil(r.expires_at);
            const tone = d === null ? "text-foreground-tertiary" : d < 0 ? "text-destructive font-bold" : d <= 30 ? "text-[hsl(var(--accent))] font-semibold" : "text-foreground-secondary";
            return (
              <div className={`text-[12px] ${tone}`}>
                <p className="num">{fmtDate(r.expires_at)}</p>
                {d !== null && <p className="text-[10px]">{d < 0 ? `انتهت قبل ${-d} يوم` : `خلال ${d} يوم`}</p>}
              </div>
            );
          }},
      ]}
      empty={{ icon: Layers, title: "لا توجد دفعات مسجلة" }}
    />
  );
}
