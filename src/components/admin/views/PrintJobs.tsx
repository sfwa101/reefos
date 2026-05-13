import { Printer, Clock, CheckCircle2, FileText } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum } from "@/lib/format";

type PrintJob = {
  id: string;
  user_id: string;
  file_name: string | null;
  pages: number;
  copies: number;
  color_mode: string;
  sided: string;
  binding: string;
  status: string;
  total: number;
  created_at: string;
  ready_at: string | null;
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  printing: "bg-info/15 text-info",
  ready: "bg-success/15 text-success",
  delivered: "bg-muted text-foreground-tertiary",
  cancelled: "bg-destructive/15 text-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار",
  printing: "قيد الطباعة",
  ready: "جاهز للاستلام",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export default function PrintJobsAdmin() {
  return (
    <UniversalAdminGrid<PrintJob>
      title="طلبات الطباعة"
      subtitle="قائمة الانتظار، الطلبات الجاهزة، وإيرادات خدمة الطباعة"
      dataSource={{
        table: "print_jobs",
        select: "id,user_id,file_name,pages,copies,color_mode,sided,binding,status,total,created_at,ready_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 200,
        searchKeys: ["file_name", "status", "color_mode", "binding"],
      }}
      metrics={[
        {
          key: "queue", label: "قائمة الانتظار", icon: Clock, tone: "warning",
          compute: (rows) => fmtNum((rows as PrintJob[]).filter(r => r.status === "pending" || r.status === "printing").length),
          urgent: (rows) => (rows as PrintJob[]).filter(r => r.status === "pending").length > 3,
        },
        {
          key: "ready", label: "جاهز للاستلام", icon: CheckCircle2, tone: "success",
          compute: (rows) => fmtNum((rows as PrintJob[]).filter(r => r.status === "ready").length),
        },
        {
          key: "pages", label: "إجمالي الصفحات", icon: FileText, tone: "info",
          compute: (rows) => fmtNum((rows as PrintJob[]).reduce((s, r) => s + (Number(r.pages) * Number(r.copies || 1)), 0)),
        },
        {
          key: "revenue", label: "إيرادات (آخر 200)", icon: Printer, tone: "primary",
          compute: (rows) => fmtMoney((rows as PrintJob[]).reduce((s, r) => s + Number(r.total || 0), 0)),
        },
      ]}
      columns={[
        {
          key: "file_name", className: "flex-1",
          render: (r) => (
            <>
              <p className="text-[13px] font-semibold truncate">{r.file_name || `#${r.id.slice(0, 8)}`}</p>
              <p className="text-[11px] text-foreground-tertiary">
                {r.pages}ص × {r.copies}نسخة • {r.color_mode === "color" ? "ألوان" : "أبيض وأسود"} • {r.sided === "double" ? "وجهين" : "وجه واحد"}
              </p>
            </>
          ),
        },
        {
          key: "total", className: "shrink-0 text-right", hideOnMobile: true,
          render: (r) => <p className="text-[13px] font-display num">{fmtMoney(r.total)}</p>,
        },
        {
          key: "status", className: "shrink-0",
          render: (r) => (
            <span className={`text-[10.5px] px-2 py-1 rounded-full font-semibold ${STATUS_TONE[r.status] ?? "bg-muted text-foreground-secondary"}`}>
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          ),
        },
      ]}
      searchPlaceholder="ابحث باسم الملف أو الحالة..."
      empty={{ icon: Printer, title: "لا توجد طلبات طباعة", hint: "ستظهر طلبات الطباعة الواردة من العملاء هنا." }}
    />
  );
}
