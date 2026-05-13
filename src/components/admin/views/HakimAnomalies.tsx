import { AlertOctagon, AlertTriangle, CheckCircle2, Radar, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { resolveHakimAnomalyFn } from "@/lib/hakim.functions";
import { fmtNum, fmtRelative } from "@/lib/format";

interface AnomalyRow {
  id: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  description: string;
  source: string | null;
  fingerprint: string | null;
  occurrences: number;
  user_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const SEV_BADGE: Record<AnomalyRow["severity"], string> = {
  critical: "bg-destructive/10 text-destructive",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

const SEV_LABEL: Record<AnomalyRow["severity"], string> = {
  critical: "حرجة",
  error: "خطأ",
  warning: "تحذير",
  info: "معلومة",
};

export default function HakimAnomalies() {
  const resolveAnomaly = async (row: AnomalyRow) => {
    try {
      await resolveHakimAnomalyFn({ data: { id: row.id } });
      toast.success("تم إغلاق التنبيه");
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("تعذر إغلاق التنبيه");
    }
  };

  return (
    <UniversalAdminGrid<AnomalyRow>
      title="رادار حكيم — اكتشاف الشذوذ"
      subtitle="تنبيهات ذكية للسلوك غير الطبيعي والتلاعب التشغيلي"
      dataSource={{
        table: "hakim_anomalies",
        select: "id,type,severity,description,source,fingerprint,occurrences,user_id,resolved,resolved_at,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 300,
        searchKeys: ["type", "description", "source", "fingerprint"],
      }}
      metrics={[
        {
          key: "critical",
          label: "حالات حرجة مفتوحة",
          icon: AlertOctagon,
          tone: "warning",
          compute: (rows) => fmtNum(rows.filter((r) => !r.resolved && (r.severity === "critical" || r.severity === "error")).length),
          urgent: (rows) => rows.some((r) => !r.resolved && r.severity === "critical"),
        },
        {
          key: "open",
          label: "تنبيهات مفتوحة",
          icon: ShieldAlert,
          tone: "accent",
          compute: (rows) => fmtNum(rows.filter((r) => !r.resolved).length),
        },
        {
          key: "warnings",
          label: "تحذيرات",
          icon: AlertTriangle,
          tone: "info",
          compute: (rows) => fmtNum(rows.filter((r) => !r.resolved && r.severity === "warning").length),
        },
        {
          key: "resolved",
          label: "تم إغلاقها",
          icon: CheckCircle2,
          tone: "success",
          compute: (rows) => fmtNum(rows.filter((r) => r.resolved).length),
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
                <p className="font-display text-[13.5px] truncate">{r.type}</p>
              </div>
              <p className="text-[12px] text-foreground-secondary truncate">{r.description}</p>
              <p className="text-[10.5px] text-foreground-tertiary num">
                {fmtRelative(r.created_at)} • تكرار: {r.occurrences}
                {r.source && ` • ${r.source}`}
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
                (r.resolved ? "bg-success/10 text-success" : "bg-warning/10 text-warning")
              }
            >
              {r.resolved ? "مغلق" : "مفتوح"}
            </span>
          ),
        },
      ]}
      rowActions={[
        {
          label: "إغلاق",
          tone: "success",
          icon: CheckCircle2,
          onClick: (r) => {
            if (!r.resolved) resolveAnomaly(r);
            else toast.info("هذا التنبيه مغلق بالفعل");
          },
        },
      ]}
      empty={{
        icon: Radar,
        title: "لا توجد حالات شذوذ",
        hint: "النظام نظيف — حكيم يراقب باستمرار.",
      }}
    />
  );
}
