import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import {
  listSuppliersFullFn,
  createSupplierFn,
  updateSupplierFn,
  deleteSupplierFn,
  type SupplierFullRow,
} from "@/core/catalog/admin-catalog.functions";
import { fmtMoney } from "@/lib/format";
import { Loader2, ShieldAlert, Plus, Building2, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Supplier = SupplierFullRow;

export default function Suppliers() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance") || hasRole("store_manager");
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contact_phone: "", closing_day: "", collection_days: "", payment_terms_days: "30" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; contact_phone: string; closing_day: string; collection_days: string; payment_terms_days: string }>({ name: "", contact_phone: "", closing_day: "", collection_days: "", payment_terms_days: "30" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateSupplier = useServerFn(updateSupplierFn);
  const deleteSupplier = useServerFn(deleteSupplierFn);

  const load = async () => {
    setLoading(true);
    try { setRows(await listSuppliersFullFn()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (allowed) load(); else setLoading(false); }, [allowed]);

  const create = async () => {
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    const days = form.collection_days.split(",").map((s) => parseInt(s.trim())).filter((n) => Number.isFinite(n));
    try {
      await createSupplierFn({
        data: {
          name: form.name.trim(),
          contact_phone: form.contact_phone || null,
          closing_day: form.closing_day ? parseInt(form.closing_day) : null,
          collection_days: days,
          payment_terms_days: parseInt(form.payment_terms_days) || 30,
        },
      });
      toast.success("تم إضافة المورد");
      setForm({ name: "", contact_phone: "", closing_day: "", collection_days: "", payment_terms_days: "30" });
      setShowForm(false);
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (rolesLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed) return (
    <><MobileTopbar title="الموردون" />
      <div className="p-8 text-center" dir="rtl"><ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" /><p>متاح للمالية والإدارة فقط</p></div>
    </>
  );

  const totalOutstanding = rows.reduce((s, r) => s + Number(r.outstanding_balance || 0), 0);

  return (
    <>
      <MobileTopbar title="الموردون" />
      <div className="px-4 lg:px-6 py-4 max-w-3xl mx-auto space-y-4" dir="rtl">
        <div className="bg-gradient-to-br from-primary/10 to-primary-glow/10 rounded-2xl p-4 border border-primary/20">
          <p className="text-[12px] text-foreground-tertiary">إجمالي المستحقات للموردين</p>
          <p className="font-display text-[24px] mt-1">{fmtMoney(totalOutstanding)}</p>
          <p className="text-[12px] text-foreground-tertiary mt-1">{rows.length} مورد</p>
        </div>

        <Button variant="ghost" onClick={() => setShowForm(!showForm)} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? "إخفاء" : "إضافة مورد"}
        </Button>

        {showForm && (
          <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-2">
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="اسم المورد" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="هاتف" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="يوم التقفيل (1-31)" value={form.closing_day} onChange={(e) => setForm({ ...form, closing_day: e.target.value })} />
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="أيام التحصيل (مثال: 5,15,25)" value={form.collection_days} onChange={(e) => setForm({ ...form, collection_days: e.target.value })} />
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="مهلة الدفع (أيام)" value={form.payment_terms_days} onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })} />
            <Button variant="ghost" onClick={create} className="w-full bg-primary text-primary-foreground rounded-lg py-2 font-medium">حفظ</Button>
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r) => {
            const isEditing = editingId === r.id;
            const busy = busyId === r.id;
            return (
              <div key={r.id} className="bg-surface rounded-xl p-3 border border-border/40">
                {!isEditing ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Building2 className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px] truncate">{r.name}</p>
                      <p className="text-[11px] text-foreground-tertiary">
                        تقفيل: {r.closing_day ?? "-"} • تحصيل: {(r.collection_days || []).join("/") || "-"}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-display text-[14px] text-destructive">{fmtMoney(r.outstanding_balance)}</p>
                      <p className="text-[10px] text-foreground-tertiary">مستحق</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost"
                        onClick={() => {
                          setEditingId(r.id);
                          setEditForm({
                            name: r.name,
                            contact_phone: r.contact_phone ?? "",
                            closing_day: r.closing_day != null ? String(r.closing_day) : "",
                            collection_days: (r.collection_days || []).join(","),
                            payment_terms_days: String(r.payment_terms_days ?? 30),
                          });
                        }}
                        className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-foreground-secondary press"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost"
                        onClick={async () => {
                          if (!confirm(`تعطيل المورد "${r.name}"؟`)) return;
                          setBusyId(r.id);
                          try {
                            await deleteSupplier({ data: { id: r.id } });
                            toast.success("تم تعطيل المورد");
                            await load();
                          } catch (e) { toast.error((e as Error).message); }
                          finally { setBusyId(null); }
                        }}
                        disabled={busy}
                        className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive press disabled:opacity-50"
                        title="تعطيل"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="اسم المورد" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="هاتف" value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} />
                    <div className="grid grid-cols-3 gap-2">
                      <Input className="bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="يوم تقفيل" value={editForm.closing_day} onChange={(e) => setEditForm({ ...editForm, closing_day: e.target.value })} />
                      <Input className="bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="أيام تحصيل" value={editForm.collection_days} onChange={(e) => setEditForm({ ...editForm, collection_days: e.target.value })} />
                      <Input className="bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="مهلة دفع" value={editForm.payment_terms_days} onChange={(e) => setEditForm({ ...editForm, payment_terms_days: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                        className="h-9 px-3 rounded-lg bg-muted text-[12.5px] flex items-center gap-1 press disabled:opacity-50"
                      >
                        <X className="h-4 w-4" /> إلغاء
                      </Button>
                      <Button variant="ghost"
                        onClick={async () => {
                          const name = editForm.name.trim();
                          if (!name) return toast.error("الاسم مطلوب");
                          const days = editForm.collection_days
                            .split(",").map((s) => parseInt(s.trim()))
                            .filter((n) => Number.isFinite(n));
                          setBusyId(r.id);
                          try {
                            await updateSupplier({
                              data: {
                                id: r.id,
                                name,
                                contact_phone: editForm.contact_phone.trim() || null,
                                closing_day: editForm.closing_day ? parseInt(editForm.closing_day) : null,
                                collection_days: days,
                                payment_terms_days: parseInt(editForm.payment_terms_days) || 30,
                              },
                            });
                            toast.success("تم تحديث المورد");
                            setEditingId(null);
                            await load();
                          } catch (e) { toast.error((e as Error).message); }
                          finally { setBusyId(null); }
                        }}
                        disabled={busy}
                        className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1 press disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} حفظ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-center text-foreground-tertiary py-8 text-[13px]">لا يوجد موردون بعد</p>}
        </div>
      </div>
    </>
  );
}
