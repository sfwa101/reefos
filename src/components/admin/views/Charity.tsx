import { useEffect, useState } from "react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import {
  getCharityOverviewFn,
  createCharityRuleFn,
  setCharityRuleActiveFn,
  type CharityRule as Rule,
  type CharityDue as Due,
} from "@/core/finance/finance.functions";
import { fmtMoney } from "@/lib/format";
import { Loader2, ShieldAlert, Plus, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Charity() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance");
  const [rules, setRules] = useState<Rule[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [snapshot, setSnapshot] = useState<{ gross_sales: number; net_profit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", base: "net_profit", percentage: "2.5", fixed_amount: "", frequency: "monthly" });
  const [periodDays, setPeriodDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const overview = await getCharityOverviewFn({ data: { period_days: periodDays } });
      setRules(overview.rules);
      if (overview.dues) {
        setDues(overview.dues.rules);
        setSnapshot({ gross_sales: overview.dues.gross_sales, net_profit: overview.dues.net_profit });
      } else {
        setDues([]);
        setSnapshot(null);
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (allowed) load(); else setLoading(false); }, [allowed, periodDays]);

  const create = async () => {
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    try {
      await createCharityRuleFn({
        data: {
          name: form.name.trim(),
          base: form.base as Rule["base"],
          frequency: form.frequency as Rule["frequency"],
          percentage: form.base === "custom_amount" ? null : parseFloat(form.percentage) || 0,
          fixed_amount: form.base === "custom_amount" ? parseFloat(form.fixed_amount) || 0 : null,
        },
      });
      toast.success("تم");
      setForm({ name: "", base: "net_profit", percentage: "2.5", fixed_amount: "", frequency: "monthly" });
      setShowForm(false);
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const toggle = async (id: string, current: boolean) => {
    try {
      await setCharityRuleActiveFn({ data: { id, is_active: !current } });
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (rolesLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed) return (<><MobileTopbar title="الصدقات" /><div className="p-8 text-center" dir="rtl"><ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" /><p>غير متاح</p></div></>);

  const totalDue = dues.reduce((s, d) => s + Number(d.due_amount || 0), 0);

  return (
    <>
      <MobileTopbar title="حاسبة الصدقات" />
      <div className="px-4 lg:px-6 py-4 max-w-3xl mx-auto space-y-4" dir="rtl">
        <div className="bg-gradient-to-br from-success/10 to-teal-500/10 rounded-2xl p-4 border border-success/20">
          <p className="text-[12px] text-foreground-tertiary">المبلغ المستحق للصدقة (آخر {periodDays} يوم)</p>
          <p className="font-display text-[28px] mt-1 text-success">{fmtMoney(totalDue)}</p>
          {snapshot && (
            <p className="text-[11px] text-foreground-tertiary mt-1">
              مبيعات: {fmtMoney(snapshot.gross_sales)} • صافي ربح: {fmtMoney(snapshot.net_profit)}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button key={d} onClick={() => setPeriodDays(d)} className={`px-3 py-1.5 rounded-lg text-[12px] ${periodDays === d ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {d} يوم
            </Button>
          ))}
        </div>

        <Button onClick={() => setShowForm(!showForm)} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? "إخفاء" : "إضافة قاعدة"}
        </Button>

        {showForm && (
          <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-2">
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="اسم القاعدة (مثال: زكاة شهرية)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="bg-muted rounded-lg px-3 py-2 text-[14px]" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })}>
                <option value="net_profit">من صافي الربح</option>
                <option value="gross_sales">من إجمالي المبيعات</option>
                <option value="custom_amount">مبلغ ثابت</option>
              </select>
              <select className="bg-muted rounded-lg px-3 py-2 text-[14px]" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
            {form.base === "custom_amount" ? (
              <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="المبلغ الثابت" value={form.fixed_amount} onChange={(e) => setForm({ ...form, fixed_amount: e.target.value })} />
            ) : (
              <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="النسبة %" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} />
            )}
            <Button onClick={create} className="w-full bg-primary text-primary-foreground rounded-lg py-2 font-medium">حفظ</Button>
          </div>
        )}

        <div className="space-y-2">
          {rules.map((r) => {
            const due = dues.find((d) => d.rule_id === r.id);
            return (
              <div key={r.id} className="bg-surface rounded-xl p-3 border border-border/40 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center text-success"><HeartHandshake className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14px] truncate">{r.name}</p>
                  <p className="text-[11px] text-foreground-tertiary">
                    {r.base === "custom_amount" ? `ثابت ${fmtMoney(r.fixed_amount || 0)}` : `${r.percentage}% من ${r.base === "net_profit" ? "صافي الربح" : "المبيعات"}`} • {r.frequency === "daily" ? "يومي" : r.frequency === "weekly" ? "أسبوعي" : "شهري"}
                  </p>
                </div>
                {due && <p className="font-display text-[13px] text-success">{fmtMoney(due.due_amount)}</p>}
                <Button onClick={() => toggle(r.id, r.is_active)} className={`text-[11px] px-2 py-1 rounded-lg ${r.is_active ? "bg-success/10 text-success" : "bg-muted text-foreground-tertiary"}`}>
                  {r.is_active ? "نشط" : "موقوف"}
                </Button>
              </div>
            );
          })}
          {rules.length === 0 && <p className="text-center text-foreground-tertiary py-8 text-[13px]">أضف قاعدة لبدء الحساب</p>}
        </div>
      </div>
    </>
  );
}
