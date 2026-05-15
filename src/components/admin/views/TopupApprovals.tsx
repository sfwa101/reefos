import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import {
  listPendingTopupsFn, approveTopupFn, rejectTopupFn,
  type PendingTopupRow,
} from "@/core/finance/finance.functions";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, ShieldAlert, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const METHOD_LABEL: Record<string, string> = {
  vodafone_cash: "فودافون كاش", instapay: "إنستاباي",
  bank_transfer: "تحويل بنكي", cash: "كاش",
};

export default function TopupApprovals() {
  const { hasRole, loading } = useAdminRoles();
  const listPending = useServerFn(listPendingTopupsFn);
  const approveFn = useServerFn(approveTopupFn);
  const rejectFn = useServerFn(rejectTopupFn);
  const [rows, setRows] = useState<PendingTopupRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await listPending();
      setRows(data);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [listPending]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!hasRole("admin")) {
    return (
      <>
        <MobileTopbar title="موافقات الشحن" />
        <div className="p-8 text-center" dir="rtl">
          <ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" />
          <p className="font-display text-[16px]">اعتماد الشحن متاح للأدمن فقط (Maker-Checker)</p>
        </div>
      </>
    );
  }

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await approveFn({ data: { id } });
      toast.success("تم اعتماد الشحن وإضافة الرصيد للعميل");
      await load();
    } catch (e) {
      const m = (e as Error).message;
      const map: Record<string, string> = {
        "forbidden_admin_only": "اعتماد الشحن للأدمن فقط",
        "topup_not_found": "الطلب غير موجود",
        "already_processed": "الطلب تم بالفعل",
        "maker_cannot_approve_own": "لا يمكنك اعتماد طلب أنشأته بنفسك",
      };
      toast.error(Object.entries(map).find(([k]) => m.includes(k))?.[1] ?? m);
    } finally { setBusyId(null); }
  };

  const reject = async (id: string) => {
    const r = (reason[id] ?? "").trim();
    if (r.length < 3) { toast.error("اكتب سبب الرفض (3 أحرف على الأقل)"); return; }
    setBusyId(id);
    try {
      await rejectFn({ data: { id, reason: r } });
      toast.success("تم رفض الطلب");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusyId(null); }
  };

  return (
    <>
      <MobileTopbar title="موافقات الشحن" />
      <div className="px-4 lg:px-6 pt-2 pb-6 max-w-3xl mx-auto space-y-3" dir="rtl">
        <div className="bg-info/10 border border-info/20 rounded-2xl p-3 text-[12.5px] text-info">
          <Clock className="inline h-4 w-4 ml-1" />
          النظام يعمل بمبدأ Maker-Checker: الموظف ينشئ الطلب والأدمن يعتمده. لا يمكن اعتماد طلب أنشأته بنفسك.
        </div>

        {rows.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border/40 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-2" />
            <p className="text-[14px] font-bold">لا توجد طلبات معلقة</p>
            <p className="text-[12px] text-foreground-tertiary">جميع طلبات الشحن تمت معالجتها.</p>
          </div>
        ) : rows.map(t => (
          <div key={t.id} className="bg-surface rounded-2xl border border-border/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-[22px] num">{fmtMoney(Number(t.amount))}</p>
                <p className="text-[11.5px] text-foreground-tertiary">
                  {METHOD_LABEL[t.method] ?? t.method} • #{t.transfer_reference}
                </p>
              </div>
              <span className="text-[10px] bg-warning/10 text-warning px-2 py-1 rounded-full font-bold">معلّق</span>
            </div>

            <div className="text-[12px] space-y-1 bg-surface-muted rounded-xl p-2.5">
              <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-foreground-tertiary" />
                <span className="text-foreground-tertiary">العميل:</span>
                <span className="font-mono text-[10.5px]">{t.user_id.slice(0, 8)}…</span>
              </div>
              <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-foreground-tertiary" />
                <span className="text-foreground-tertiary">المُنشئ:</span>
                <span className="font-semibold">{t.performed_by_name ?? "—"}</span>
              </div>
              <div className="text-foreground-tertiary text-[11px]">
                {new Date(t.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
              </div>
              {t.note && <p className="text-[11.5px] pt-1 border-t border-border/40">📝 {t.note}</p>}
            </div>

            <Input
              value={reason[t.id] ?? ""}
              onChange={(e) => setReason(s => ({ ...s, [t.id]: e.target.value }))}
              placeholder="سبب الرفض (مطلوب عند الرفض)"
              className="w-full h-10 rounded-xl bg-surface-muted px-3 text-[13px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => approve(t.id)}
                disabled={busyId === t.id}
                className="h-11 rounded-xl bg-success text-success-foreground font-bold text-[13px] press disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {busyId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                اعتماد
              </Button>
              <Button
                onClick={() => reject(t.id)}
                disabled={busyId === t.id}
                className="h-11 rounded-xl bg-destructive text-destructive-foreground font-bold text-[13px] press disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <XCircle className="h-4 w-4" /> رفض
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
