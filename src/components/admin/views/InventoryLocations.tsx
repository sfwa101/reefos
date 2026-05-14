import { Warehouse, Package, AlertTriangle, Boxes } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";

type Row = {
  id: string;
  product_id: string;
  warehouse_id: string;
  stock: number;
  reserved: number;
  reorder_point: number | null;
  last_restocked_at: string | null;
  warehouses?: { name: string | null } | null;
};

export default function InventoryLocations() {
  return (
    <UniversalAdminGrid<Row>
      title="مواقع المخزون"
      subtitle="حركة المخزون لكل فرع/مستودع"
      metrics={[
        { key: "rows", label: "سجلات", icon: Boxes, tone: "primary", compute: (r) => r.length },
        { key: "stock", label: "إجمالي المخزون", icon: Package, tone: "info",
          compute: (r) => r.reduce((s, x) => s + (x.stock ?? 0), 0) },
        { key: "reserved", label: "المحجوز", icon: Warehouse, tone: "purple",
          compute: (r) => r.reduce((s, x) => s + (x.reserved ?? 0), 0) },
        { key: "low", label: "تحت نقطة الطلب", icon: AlertTriangle, tone: "warning",
          compute: (r) => r.filter((x) => (x.stock ?? 0) <= (x.reorder_point ?? 0)).length },
      ]}
      dataSource={{
        table: "inventory_locations",
        select: "id,product_id,warehouse_id,stock,reserved,reorder_point,last_restocked_at,warehouses(name)",
        orderBy: { column: "updated_at", ascending: false },
        limit: 500,
        searchKeys: ["product_id"],
      }}
      searchPlaceholder="بحث برقم المنتج..."
      columns={[
        { key: "product", label: "المنتج", className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[14px] truncate">{r.product_id}</p>
              <p className="text-[11px] text-foreground-tertiary truncate">{r.warehouses?.name || r.warehouse_id.slice(0, 8)}</p>
            </div>
          )},
        { key: "stock", label: "المخزون", className: "shrink-0 w-20 text-center",
          render: (r) => <span className="num font-semibold text-[14px]">{r.stock}</span> },
        { key: "reserved", label: "محجوز", hideOnMobile: true, className: "shrink-0 w-20 text-center",
          render: (r) => <span className="num text-[13px] text-foreground-secondary">{r.reserved}</span> },
        { key: "rop", label: "نقطة الطلب", hideOnMobile: true, className: "shrink-0 w-24 text-center",
          render: (r) => {
            const low = (r.stock ?? 0) <= (r.reorder_point ?? 0);
            return <span className={`num text-[12px] ${low ? "text-destructive font-bold" : "text-foreground-tertiary"}`}>{r.reorder_point ?? "—"}</span>;
          }},
      ]}
      empty={{ icon: Warehouse, title: "لا توجد مواقع مخزون" }}
    />
  );
}
