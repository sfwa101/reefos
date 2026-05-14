import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Clock, Eye } from "lucide-react";
import { UniversalAdminGrid, type BentoMetric, type Column, type RowAction } from "@/components/admin/UniversalAdminGrid";
import { getKycSignedUrlsFn, updateKycStatusFn } from "@/core/hr/hr.functions";
import { fmtNum } from "@/lib/format";
import { toast } from "sonner";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "بانتظار", cls: "bg-warning/15 text-warning" },
  approved: { label: "موثّق", cls: "bg-success/15 text-success" },
  verified: { label: "موثّق", cls: "bg-success/15 text-success" },
  rejected: { label: "مرفوض", cls: "bg-destructive/10 text-destructive" },
};

type KycRow = {
  id: string;
  user_id: string;
  national_id: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  front_image_path?: string | null;
  back_image_path?: string | null;
};

export default function KycAdmin() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const [viewing, setViewing] = useState<KycRow | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const update = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateKycStatusFn({ data: { id, status } });
      toast.success(status === "approved" ? "تم التوثيق" : "تم الرفض");
      refresh();
    } catch (e) {
      toast.error("فشل التحديث: " + (e as Error).message);
    }
  };

  const openDocs = async (r: KycRow) => {
    setViewing(r);
    setFrontUrl(null);
    setBackUrl(null);
    setLoadingDocs(true);
    try {
      const { frontUrl, backUrl } = await getKycSignedUrlsFn({ data: { id: r.id } });
      setFrontUrl(frontUrl);
      setBackUrl(backUrl);
    } catch (e) {
      toast.error("فشل تحميل المستندات: " + ((e as Error)?.message ?? ""));
    } finally {
      setLoadingDocs(false);
    }
  };

  return (
    <>
      <UniversalAdminGrid
        key={refreshKey}
        title="التحقق KYC"
        subtitle="مراجعة طلبات توثيق الهوية الوطنية"
        dataSource={{
          table: "kyc_verifications",
          select: "id,user_id,national_id,status,submitted_at,reviewed_at",
          orderBy: { column: "submitted_at", ascending: false },
          searchKeys: ["national_id", "status"],
        }}
        metrics={[
          { key: "pending", label: "قيد المراجعة", icon: Clock, tone: "warning",
            compute: (rows) => fmtNum(rows.filter((r: any) => r.status === "pending").length),
            urgent: (rows) => rows.some((r: any) => r.status === "pending") },
          { key: "approved", label: "موثّقون", icon: ShieldCheck, tone: "success",
            compute: (rows) => fmtNum(rows.filter((r: any) => r.status === "approved" || r.status === "verified").length) },
          { key: "rejected", label: "مرفوضون", icon: ShieldX, tone: "accent",
            compute: (rows) => fmtNum(rows.filter((r: any) => r.status === "rejected").length) },
          { key: "total", label: "إجمالي الطلبات", icon: ShieldAlert, tone: "info",
            compute: (rows) => fmtNum(rows.length) },
        ]}
        columns={[
          { key: "national_id", className: "flex-1", render: (r: any) => (
            <>
              <p className="text-[13.5px] font-medium font-mono">{r.national_id ?? "—"}</p>
              <p className="text-[11px] text-foreground-tertiary">{new Date(r.submitted_at).toLocaleDateString("ar-EG")}</p>
            </>
          ) },
          { key: "status", className: "shrink-0", render: (r: any) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            return <span className={`text-[10.5px] px-2 py-1 rounded-full font-semibold ${s.cls}`}>{s.label}</span>;
          } },
        ]}
        rowActions={[
          { label: "عرض", icon: Eye, onClick: (r: any) => openDocs(r) },
          { label: "توثيق", tone: "success", onClick: (r: any) => update(r.id, "approved") },
          { label: "رفض", tone: "destructive", onClick: (r: any) => update(r.id, "rejected") },
        ]}
        searchPlaceholder="ابحث برقم الهوية..."
        empty={{ title: "لا توجد طلبات توثيق", hint: "ستظهر هنا فور تقديمها." }}
      />

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-card border border-border p-4 space-y-3 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">مستندات التحقق</h2>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="px-2 py-1 text-sm border border-border rounded"
              >إغلاق</button>
            </div>
            <div className="text-xs text-foreground-tertiary">
              <p>الرقم القومي: <span className="font-mono">{viewing.national_id ?? "—"}</span></p>
              <p>المستخدم: <span className="font-mono">{viewing.user_id}</span></p>
              <p>الحالة: {STATUS[viewing.status]?.label ?? viewing.status}</p>
            </div>

            {loadingDocs ? (
              <p className="text-sm">جاري تحميل المستندات...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1">وجه الهوية</p>
                  {frontUrl ? (
                    <a href={frontUrl} target="_blank" rel="noreferrer">
                      <img src={frontUrl} alt="front" className="w-full rounded border border-border" />
                    </a>
                  ) : (
                    <p className="text-xs text-foreground-tertiary">لا توجد صورة</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">ظهر الهوية</p>
                  {backUrl ? (
                    <a href={backUrl} target="_blank" rel="noreferrer">
                      <img src={backUrl} alt="back" className="w-full rounded border border-border" />
                    </a>
                  ) : (
                    <p className="text-xs text-foreground-tertiary">لا توجد صورة</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={async () => { await update(viewing.id, "rejected"); setViewing(null); }}
                className="px-3 py-1.5 rounded bg-destructive text-destructive-foreground text-sm font-bold"
              >رفض</button>
              <button
                type="button"
                onClick={async () => { await update(viewing.id, "approved"); setViewing(null); }}
                className="px-3 py-1.5 rounded bg-success text-success-foreground text-sm font-bold"
              >توثيق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
