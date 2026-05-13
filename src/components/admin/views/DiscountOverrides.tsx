import { ShieldAlert, Percent, TrendingDown, Users } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";

interface OverrideRow {
  id: string;
  product_id: string;
  product_name: string;
  override_by: string;
  override_by_name: string | null;
  cost_price: number | null;
  sale_price: number;
  attempted_discount: number;
  margin_amount: number;
  reason: string;
  created_at: string;
}

export default function DiscountOverrides() {
  return (
    <UniversalAdminGrid<OverrideRow>
      title="تجاوزات الخصومات اليدوية"
      subtitle="سجل تجاوزات حدود الخصم التي قام بها المديرون يدوياً"
      dataSource={{
        table: "discount_overrides",
        select:
          "id,product_id,product_name,override_by,override_by_name,cost_price,sale_price,attempted_discount,margin_amount,reason,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 300,
        searchKeys: ["product_name", "override_by_name", "reason"],
      }}
      metrics={[
        {
          key: "today",
          label: "تجاوزات اليوم",
          icon: ShieldAlert,
          tone: "warning",
          compute: (rows) => {
            const today = new Date().toDateString();
            return fmtNum(rows.filter((r) => new Date(r.created_at).toDateString() === today).length);
          },
          urgent: (rows) => {
            const today = new Date().toDateString();
            return rows.some((r) => new Date(r.created_at).toDateString() === today);
          },
        },
        {
          key: "margin_loss",
          label: "إجمالي الهامش المتنازل عنه",
          icon: TrendingDown,
          tone: "accent",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + Number(r.margin_amount ?? 0), 0)),
        },
        {
          key: "avg_discount",
          label: "متوسط الخصم",
          icon: Percent,
          tone: "info",
          compute: (rows) => {
            if (!rows.length) return "0%";
            const avg = rows.reduce((s, r) => s + Number(r.attempted_discount ?? 0), 0) / rows.length;
            return `${avg.toFixed(1)}%`;
          },
        },
        {
          key: "managers",
          label: "مديرون نفذوا تجاوزات",
          icon: Users,
          tone: "primary",
          compute: (rows) => fmtNum(new Set(rows.map((r) => r.override_by)).size),
        },
      ]}
      columns={[
        {
          key: "info",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate">{r.product_name}</p>
              <p className="text-[11.5px] text-foreground-secondary truncate">
                بواسطة: {r.override_by_name ?? `#${r.override_by.slice(0, 6).toUpperCase()}`}
              </p>
              <p className="text-[11px] text-foreground-tertiary truncate">{r.reason}</p>
              <p className="text-[10.5px] text-foreground-tertiary num">{fmtRelative(r.created_at)}</p>
            </div>
          ),
        },
        {
          key: "discount",
          className: "shrink-0 text-left",
          hideOnMobile: true,
          render: (r) => (
            <div>
              <p className="text-[12px] num text-foreground-secondary">سعر: {fmtMoney(Number(r.sale_price))}</p>
              {r.cost_price != null && (
                <p className="text-[10.5px] num text-foreground-tertiary">تكلفة: {fmtMoney(Number(r.cost_price))}</p>
              )}
            </div>
          ),
        },
        {
          key: "metrics",
          className: "shrink-0 text-left",
          render: (r) => (
            <div>
              <p className="font-display text-[14px] num text-destructive">{Number(r.attempted_discount).toFixed(1)}%</p>
              <p className="text-[10.5px] num text-foreground-tertiary">هامش {fmtMoney(Number(r.margin_amount))}</p>
            </div>
          ),
        },
      ]}
      empty={{ title: "لا توجد تجاوزات", hint: "أي خصم يدوي يتجاوز السقف المعتمد سيُسجَّل هنا." }}
    />
  );
}
