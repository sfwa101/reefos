import { Coins, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtNum } from "@/lib/format";

type Row = {
  id: string;
  affiliate_user_id: string;
  product_name: string | null;
  category: string | null;
  commission_pct: number;
  base_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "معلّقة",
  vesting: "قيد النضج",
  payable: "قابلة للدفع",
  paid: "مدفوعة",
  clawed_back: "مستردة",
  cancelled: "ملغاة",
};
const STATUS_TONE: Record<string, string> = {
  pending: "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  vesting: "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]",
  payable: "bg-[hsl(var(--purple))]/15 text-[hsl(var(--purple))]",
  paid: "bg-success/15 text-success",
  clawed_back: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-foreground-tertiary",
};

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "short" }); } catch { return iso; } };

export default function CommissionLedger() {
  return (
    <UniversalAdminGrid<Row>
      title="سجل عمولات المسوقين"
      subtitle="عمولات الأفلييت — معلّق، قابل للدفع، ومدفوع"
      metrics={[
        { key: "total", label: "السجلات", icon: Coins, tone: "primary", compute: (r) => r.length },
        { key: "payable", label: "قابلة للدفع", icon: Wallet, tone: "info",
          compute: (r) => fmtNum(r.filter((x) => x.status === "payable").reduce((s, x) => s + Number(x.commission_amount ?? 0), 0)) },
        { key: "pending", label: "معلّقة", icon: Clock, tone: "warning",
          compute: (r) => fmtNum(r.filter((x) => x.status === "pending").reduce((s, x) => s + Number(x.commission_amount ?? 0), 0)) },
        { key: "paid", label: "مدفوعة", icon: CheckCircle2, tone: "success",
          compute: (r) => fmtNum(r.filter((x) => x.status === "paid").reduce((s, x) => s + Number(x.commission_amount ?? 0), 0)) },
      ]}
      dataSource={{
        table: "commission_ledger",
        select: "id,affiliate_user_id,product_name,category,commission_pct,base_amount,commission_amount,status,created_at,paid_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 500,
        searchKeys: ["product_name", "category", "status"],
      }}
      searchPlaceholder="بحث بالمنتج أو التصنيف..."
      columns={[
        { key: "info", className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[14px] truncate">{r.product_name || "—"}</p>
              <p className="text-[11px] text-foreground-tertiary truncate">
                مسوّق: {r.affiliate_user_id.slice(0, 8)} · {r.category || "—"}
              </p>
            </div>
          )},
        { key: "amt", className: "shrink-0 w-24 text-center",
          render: (r) => (
            <div>
              <p className="num font-semibold text-[14px]">{fmtNum(Number(r.commission_amount))}</p>
              <p className="num text-[10px] text-foreground-tertiary">{Number(r.commission_pct)}%</p>
            </div>
          )},
        { key: "status", className: "shrink-0 w-24 text-center",
          render: (r) => (
            <span className={`inline-block px-2 py-1 rounded-lg text-[11.5px] font-semibold ${STATUS_TONE[r.status] ?? "bg-muted text-foreground-secondary"}`}>
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          )},
        { key: "date", hideOnMobile: true, className: "shrink-0 w-24 text-left",
          render: (r) => <span className="text-[11.5px] num text-foreground-secondary">{fmtDate(r.created_at)}</span> },
      ]}
      empty={{ icon: Coins, title: "لا توجد عمولات مسجلة" }}
    />
  );
}
