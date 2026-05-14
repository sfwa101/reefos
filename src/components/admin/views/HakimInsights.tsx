import { Eye, Lightbulb, Sparkles, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { markHakimInsightReadFn } from "@/core/hakim-ai/hakim-admin.functions";
import { fmtNum, fmtRelative } from "@/lib/format";

interface InsightRow {
  id: string;
  kind: "daily" | "weekly" | "on_demand";
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  summary: string;
  recommendations: Array<{ action: string; priority: string }> | null;
  generated_for_date: string;
  is_read: boolean;
  created_at: string;
}

const SEV_BADGE: Record<InsightRow["severity"], string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

const SEV_LABEL: Record<InsightRow["severity"], string> = {
  critical: "حرجة",
  warning: "تحذير",
  success: "إيجابية",
  info: "معلومة",
};

const KIND_LABEL: Record<InsightRow["kind"], string> = {
  daily: "يومية",
  weekly: "أسبوعية",
  on_demand: "حسب الطلب",
};

export default function HakimInsights() {
  const markRead = async (row: InsightRow) => {
    try {
      await markHakimInsightReadFn({ data: { id: row.id } });
      toast.success("تم وضع العلامة كمقروء");
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("تعذر التحديث");
    }
  };

  return (
    <UniversalAdminGrid<InsightRow>
      title="رؤى حكيم — توصيات ذكية"
      subtitle="تحليلات استباقية للأداء التجاري وفرص النمو"
      dataSource={{
        table: "hakim_insights",
        select: "id,kind,severity,title,summary,recommendations,generated_for_date,is_read,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 200,
        searchKeys: ["title", "summary", "kind"],
      }}
      metrics={[
        {
          key: "unread",
          label: "غير مقروءة",
          icon: Eye,
          tone: "accent",
          compute: (rows) => fmtNum(rows.filter((r) => !r.is_read).length),
          urgent: (rows) => rows.some((r) => !r.is_read && r.severity === "critical"),
        },
        {
          key: "critical",
          label: "توصيات حرجة",
          icon: Target,
          tone: "warning",
          compute: (rows) => fmtNum(rows.filter((r) => r.severity === "critical").length),
        },
        {
          key: "wins",
          label: "فرص إيجابية",
          icon: TrendingUp,
          tone: "success",
          compute: (rows) => fmtNum(rows.filter((r) => r.severity === "success").length),
        },
        {
          key: "total",
          label: "إجمالي الرؤى",
          icon: Sparkles,
          tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
      ]}
      columns={[
        {
          key: "main",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold " + SEV_BADGE[r.severity]}>
                  {SEV_LABEL[r.severity]}
                </span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-muted text-foreground-secondary">
                  {KIND_LABEL[r.kind]}
                </span>
                <p className="font-display text-[13.5px] truncate">{r.title}</p>
              </div>
              <p className="text-[12px] text-foreground-secondary line-clamp-2">{r.summary}</p>
              <p className="text-[10.5px] text-foreground-tertiary num mt-0.5">
                {fmtRelative(r.created_at)} • توصيات: {r.recommendations?.length ?? 0}
              </p>
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
                (r.is_read ? "bg-muted text-foreground-secondary" : "bg-primary/10 text-primary")
              }
            >
              {r.is_read ? "مقروء" : "جديد"}
            </span>
          ),
        },
      ]}
      rowActions={[
        {
          label: "تم القراءة",
          tone: "default",
          icon: Eye,
          onClick: (r) => {
            if (!r.is_read) markRead(r);
            else toast.info("مقروء بالفعل");
          },
        },
      ]}
      empty={{
        icon: Lightbulb,
        title: "لا توجد رؤى بعد",
        hint: "حكيم يجمع البيانات لتوليد أول تقرير.",
      }}
    />
  );
}
