import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import {
  listExpensesFn, createExpenseFn, updateExpenseFn, deleteExpenseFn,
  type ExpenseRow,
} from "@/core/finance/finance.functions";
import { fmtMoney } from "@/lib/format";
import { Loader2, ShieldAlert, Plus, Receipt, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { value: "operations", label: "تشغيل" },
  { value: "salaries", label: "رواتب" },
  { value: "employee_advance", label: "سلف موظفين" },
  { value: "damages", label: "هوالك" },
  { value: "personal_drawings", label: "سحوبات شخصية" },
  { value: "utilities", label: "مرافق" },
  { value: "rent", label: "إيجار" },
  { value: "marketing", label: "تسويق" },
  { value: "transport", label: "نقل" },
  { value: "other", label: "أخرى" },
];

export default function Expenses() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance") || hasRole("store_manager");
  const listExpenses = useServerFn(listExpensesFn);
  const createExpense = useServerFn(createExpenseFn);
  const updateExpense = useServerFn(updateExpenseFn);
  const deleteExpense = useServerFn(deleteExpenseFn);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "operations", subcategory: "", amount: "", expense_date: new Date().toISOString().slice(0, 10),
    paid_to: "", payment_method: "cash", reference: "", notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listExpenses();
      setRows(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (allowed) load(); else setLoading(false); /* eslint-disable-next-line */ }, [allowed]);

  const resetForm = () => setForm({
    category: "operations", subcategory: "", amount: "", expense_date: new Date().toISOString().slice(0, 10),
    paid_to: "", payment_method: "cash", reference: "", notes: "",
  });

  const submit = async () => {
    try {
      const payload = {
        category: form.category,
        subcategory: form.subcategory || null,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        paid_to: form.paid_to || null,
        payment_method: form.payment_method,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      if (editingId) {
        await updateExpense({ data: { id: editingId, ...payload } });
        toast.success("تم تحديث المصروف");
      } else {
        await createExpense({ data: payload });
        toast.success("تم تسجيل المصروف");
      }
      resetForm();
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const startEdit = (r: ExpenseRow) => {
    setEditingId(r.id);
    setForm({
      category: r.category,
      subcategory: r.subcategory ?? "",
      amount: String(r.amount),
      expense_date: r.expense_date,
      paid_to: r.paid_to ?? "",
      payment_method: r.payment_method ?? "cash",
      reference: r.reference ?? "",
      notes: r.notes ?? "",
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm("حذف المصروف؟")) return;
    try {
      await deleteExpense({ data: { id } });
      toast.success("تم الحذف");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (rolesLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed) return (<><MobileTopbar title="المصروفات" /><div className="p-8 text-center" dir="rtl"><ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" /><p>غير متاح</p></div></>);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const totalToday = rows.filter((r) => r.expense_date === today).reduce((s, r) => s + Number(r.amount), 0);
  const totalMonth = rows.filter((r) => r.expense_date >= monthStart).reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <MobileTopbar title="المصروفات" />
      <div className="px-4 lg:px-6 py-4 max-w-3xl mx-auto space-y-4" dir="rtl">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface rounded-xl p-3 border border-border/40">
            <p className="text-[11px] text-foreground-tertiary">اليوم</p>
            <p className="font-display text-[18px]">{fmtMoney(totalToday)}</p>
          </div>
          <div className="bg-surface rounded-xl p-3 border border-border/40">
            <p className="text-[11px] text-foreground-tertiary">هذا الشهر</p>
            <p className="font-display text-[18px]">{fmtMoney(totalMonth)}</p>
          </div>
        </div>

        <Button onClick={() => { if (showForm) { setEditingId(null); resetForm(); } setShowForm(!showForm); }} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? "إخفاء" : (editingId ? "تعديل مصروف" : "تسجيل مصروف")}
        </Button>

        {showForm && (
          <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-2">
            <select className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="تصنيف فرعي (اختياري)" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input className="bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="المبلغ" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input type="date" className="bg-muted rounded-lg px-3 py-2 text-[14px]" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="المستفيد" value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="bg-muted rounded-lg px-3 py-2 text-[14px]" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="cash">نقدي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="wallet">محفظة</option>
              </select>
              <Input className="bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="مرجع" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button onClick={submit} className="w-full bg-primary text-primary-foreground rounded-lg py-2 font-medium">{editingId ? "تحديث" : "حفظ"}</Button>
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-surface rounded-xl p-3 border border-border/40 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent"><Receipt className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[14px] truncate">
                  {CATEGORIES.find((c) => c.value === r.category)?.label || r.category}
                  {r.subcategory ? ` • ${r.subcategory}` : ""}
                </p>
                <p className="text-[11px] text-foreground-tertiary truncate">{r.expense_date} {r.paid_to ? `• ${r.paid_to}` : ""}</p>
              </div>
              <p className="font-display text-[14px] text-destructive">{fmtMoney(r.amount)}</p>
              <Button onClick={() => startEdit(r)} className="p-1.5 rounded-lg bg-info/10 text-info" aria-label="تعديل">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={() => remove(r.id)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive" aria-label="حذف">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-foreground-tertiary py-8 text-[13px]">لا توجد مصروفات</p>}
        </div>
      </div>
    </>
  );
}
