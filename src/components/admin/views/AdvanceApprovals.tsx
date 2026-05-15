import { useEffect, useState } from "react";
import { useCapability } from "@/hooks/useCapability";
import { fmtMoney } from "@/lib/format";
import { Loader2, ShieldAlert, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { Button } from "@/components/ui/button";
import {
  approveAdvanceFn,
  listAdvanceRequestsFn,
  rejectAdvanceFn,
  type AdvanceRequestRow,
  type EmployeeProfileRow,
} from "@/core/hr/hr.functions";

type Req = AdvanceRequestRow;
type Profile = EmployeeProfileRow;

const KIND: Record<string, string> = { advance: "سلفة", petty_cash: "نثرية", reimbursement: "استرداد" };

export default function AdvanceApprovals() {
  // Law 5 (Capability over Role): authorization resolves to a capability key,
  // never a hardcoded role string. Server middleware re-checks this on every
  // approve/reject call — the UI gate is UX, not security.
  const { allowed, loading: roleLoading } = useCapability("hr.advance.approve");
  const [rows, setRows] = useState<Req[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const state = await listAdvanceRequestsFn({ data: { filter } });
      setRows(state.rows);
      setProfiles(state.profiles);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (allowed) load(); }, [allowed, filter]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await approveAdvanceFn({ data: { requestId: id } });
      toast.success("تمت الموافقة");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusyId(null);
  };
  const reject = async (id: string) => {
    const reason = window.prompt("سبب الرفض؟");
    if (!reason) return;
    setBusyId(id);
    try {
      await rejectAdvanceFn({ data: { requestId: id, reason } });
      toast.success("تم الرفض");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusyId(null);
  };

  if (roleLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!allowed) return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div><ShieldAlert className="mx-auto h-12 w-12 text-destructive" /><p className="mt-3 font-bold">صلاحية مدير مطلوبة</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MobileTopbar title="طلبات السلف والنثريّة" />
      <main className="p-4">
        <div className="mb-3 flex gap-2">
          <Button onClick={() => setFilter("pending")} className={`rounded-full px-4 py-1.5 text-xs font-bold ${filter === "pending" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>قيد المراجعة</Button>
          <Button onClick={() => setFilter("all")} className={`rounded-full px-4 py-1.5 text-xs font-bold ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>الكل</Button>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">لا توجد طلبات</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const p = profiles[r.user_id];
              return (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{p?.full_name ?? "موظف"}</p>
                      <p className="text-[11px] text-muted-foreground" dir="ltr">{p?.phone ?? ""}</p>
                      <p className="mt-1 text-sm">{KIND[r.kind] ?? r.kind} — <span className="font-display font-extrabold text-primary">{fmtMoney(r.amount)}</span></p>
                      <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
                    </div>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      r.status === "approved" || r.status === "paid" ? "bg-success/15 text-success" :
                      r.status === "rejected" ? "bg-destructive/15 text-destructive" :
                      "bg-warning/15 text-warning"
                    }`}>
                      {r.status === "approved" || r.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> :
                       r.status === "rejected" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {r.status === "pending" ? "معلق" : r.status === "approved" ? "موافق" : r.status === "rejected" ? "مرفوض" : "مدفوع"}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button disabled={busyId === r.id} onClick={() => approve(r.id)}
                        className="rounded-full bg-success py-2 text-xs font-bold text-success-foreground disabled:opacity-50">
                        <CheckCircle2 className="me-1 inline h-3.5 w-3.5" /> موافقة
                      </Button>
                      <Button disabled={busyId === r.id} onClick={() => reject(r.id)}
                        className="rounded-full bg-destructive py-2 text-xs font-bold text-destructive-foreground disabled:opacity-50">
                        <XCircle className="me-1 inline h-3.5 w-3.5" /> رفض
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
