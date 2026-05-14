import { ArrowRightLeft, Truck, CheckCircle2, Clock } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";

type Row = {
  id: string;
  product_id: string;
  quantity_pieces: number;
  source_branch_id: string | null;
  target_branch_id: string | null;
  status: string;
  shipping_cost: number | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  approved: "موافَق عليه",
  in_transit: "قيد النقل",
  received: "تم الاستلام",
  cancelled: "ملغى",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  approved: "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]",
  in_transit: "bg-[hsl(var(--purple))]/15 text-[hsl(var(--purple))]",
  received: "bg-success/15 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function CrossBranchTransfers() {
  return (
    <UniversalAdminGrid<Row>
      title="التحويلات بين الفروع"
      subtitle="تحكم في نقل البضائع بين الفروع والمستودعات"
      metrics={[
        { key: "all", label: "إجمالي التحويلات", icon: ArrowRightLeft, tone: "primary", compute: (r) => r.length },
        { key: "pending", label: "قيد الانتظار", icon: Clock, tone: "warning",
          compute: (r) => r.filter((x) => x.status === "pending").length,
          urgent: (r) => r.some((x) => x.status === "pending") },
        { key: "transit", label: "قيد النقل", icon: Truck, tone: "purple",
          compute: (r) => r.filter((x) => x.status === "in_transit").length },
        { key: "done", label: "مُستلمة", icon: CheckCircle2, tone: "success",
          compute: (r) => r.filter((x) => x.status === "received").length },
      ]}
      dataSource={{
        table: "cross_branch_transfers",
        select: "id,product_id,quantity_pieces,source_branch_id,target_branch_id,status,shipping_cost,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 500,
        searchKeys: ["product_id", "status"],
      }}
      searchPlaceholder="بحث برقم المنتج أو الحالة..."
      columns={[
        { key: "info", className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[14px] truncate">{r.product_id}</p>
              <p className="text-[11px] text-foreground-tertiary truncate">
                {r.source_branch_id?.slice(0, 6) || "—"} ← {r.target_branch_id?.slice(0, 6) || "—"}
              </p>
            </div>
          )},
        { key: "qty", className: "shrink-0 w-16 text-center",
          render: (r) => <span className="num font-semibold text-[14px]">{r.quantity_pieces}</span> },
        { key: "status", className: "shrink-0 w-28 text-center",
          render: (r) => (
            <span className={`inline-block px-2 py-1 rounded-lg text-[11.5px] font-semibold ${STATUS_TONE[r.status] ?? "bg-muted text-foreground-secondary"}`}>
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          )},
      ]}
      empty={{ icon: ArrowRightLeft, title: "لا توجد تحويلات" }}
    />
  );
}
