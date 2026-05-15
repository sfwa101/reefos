import { useEffect, useMemo, useState } from "react";
import { Tag, Plus, Trash2, Pencil, Power, Percent, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Kpi, Field } from "./shared";
import { TIERS, type Coupon, type CouponForm, type Tier } from "./types";
import { Button } from "@/components/ui/button";
import {
  listCouponsFn,
  upsertCouponFn,
  setCouponActiveFn,
  deleteCouponFn,
} from "@/core/marketing/marketing.functions";

const blankForm: CouponForm = {
  code: "", description: "", discount_pct: 10, discount_amount: null,
  min_order_total: null, min_user_level: "bronze", per_user_limit: 1,
  max_uses: null, ends_at: "", is_active: true, type: "pct",
};

export default function CouponsPanel() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listCouponsFn();
      setRows((data ?? []) as unknown as Coupon[]);
    } catch {
      setRows([]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.is_active).length,
    used: rows.reduce((s, r) => s + (r.uses_count ?? 0), 0),
  }), [rows]);

  const toggleActive = async (row: Coupon) => {
    try {
      await setCouponActiveFn({ data: { id: row.id, is_active: !row.is_active } });
      load();
    } catch { toast.error("تعذر التحديث"); }
  };
  const remove = async (row: Coupon) => {
    if (!confirm("حذف الكوبون؟")) return;
    try {
      await deleteCouponFn({ data: { id: row.id } });
      toast.success("تم الحذف"); load();
    } catch { toast.error("فشل الحذف"); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
        <Kpi icon={Tag} label="إجمالي الكوبونات" value={fmtNum(metrics.total)} tone="primary" />
        <Kpi icon={Power} label="نشطة" value={fmtNum(metrics.active)} tone="success" />
        <Kpi icon={ShoppingBag} label="مرات الاستخدام" value={fmtNum(metrics.used)} tone="info" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-[13px] font-semibold press inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> كوبون جديد
        </Button>
      </div>

      <section className="bg-surface rounded-3xl border border-border/50 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center"><Tag className="h-10 w-10 mx-auto mb-2 text-foreground-tertiary opacity-50" /><p className="font-display text-[15px]">لا توجد كوبونات</p></div>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((r) => (
              <div key={r.id} className="px-4 lg:px-5 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0"><Tag className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[14px] truncate">{r.code}</p>
                  <p className="text-[11.5px] text-foreground-tertiary truncate">
                    {r.discount_amount ? `${fmtNum(r.discount_amount)} ج.م` : `${r.discount_pct}%`}
                    {r.min_order_total ? ` • حد أدنى ${fmtNum(r.min_order_total)}` : ""}
                    {r.min_user_level && r.min_user_level !== "bronze" ? ` • ${r.min_user_level}+` : ""}
                  </p>
                </div>
                <div className="text-left shrink-0 hidden md:block">
                  <p className="text-[11px] text-foreground-tertiary">استخدام</p>
                  <p className="font-display text-[13px] num">{fmtNum(r.uses_count ?? 0)}{r.max_uses ? `/${r.max_uses}` : ""}</p>
                </div>
                <span className={cn("h-2 w-2 rounded-full", r.is_active ? "bg-success" : "bg-foreground-tertiary")} />
                <div className="flex items-center gap-1 shrink-0">
                  <Button onClick={() => toggleActive(r)} className="h-8 w-8 rounded-xl border border-border/60 inline-flex items-center justify-center press"><Power className="h-3.5 w-3.5" /></Button>
                  <Button onClick={() => { setEditing(r); setOpen(true); }} className="h-8 w-8 rounded-xl bg-primary-soft text-primary border border-primary/20 inline-flex items-center justify-center press"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button onClick={() => remove(r)} className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 inline-flex items-center justify-center press"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CouponDialog open={open} setOpen={setOpen} editing={editing} onSaved={load} />
    </div>
  );
}

function CouponDialog({
  open, setOpen, editing, onSaved,
}: { open: boolean; setOpen: (b: boolean) => void; editing: Coupon | null; onSaved: () => void }) {
  const [form, setForm] = useState<CouponForm>(blankForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code,
        description: editing.description,
        discount_pct: editing.discount_pct,
        discount_amount: editing.discount_amount,
        min_order_total: editing.min_order_total,
        min_user_level: editing.min_user_level,
        per_user_limit: editing.per_user_limit,
        max_uses: editing.max_uses,
        ends_at: editing.ends_at ? editing.ends_at.slice(0, 16) : "",
        is_active: editing.is_active,
        type: editing.discount_amount ? "amount" : "pct",
      });
    } else {
      setForm(blankForm);
    }
  }, [editing, open]);

  const save = async () => {
    if (!form.code) { toast.error("الكود مطلوب"); return; }
    setSaving(true);
    const values = {
      code: String(form.code).toUpperCase(),
      description: form.description || null,
      discount_pct: form.type === "pct" ? Number(form.discount_pct) : 0,
      discount_amount: form.type === "amount" ? Number(form.discount_amount) : null,
      min_order_total: form.min_order_total ? Number(form.min_order_total) : null,
      min_user_level: form.min_user_level,
      per_user_limit: Number(form.per_user_limit) || 1,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
    };
    try {
      await upsertCouponFn({ data: { id: editing?.id ?? null, values } });
      toast.success("تم الحفظ"); setOpen(false); onSaved();
    } catch (e) {
      toast.error("فشل الحفظ: " + (e as Error).message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "تعديل الكوبون" : "كوبون جديد"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="الكود"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="REEF20" /></Field>
          <Field label="الوصف"><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="نوع الخصم">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={() => setForm({ ...form, type: "pct" })} className={cn("h-10 rounded-xl text-[13px] font-semibold border", form.type === "pct" ? "bg-primary-soft text-primary border-primary/30" : "bg-surface border-border/60")}><Percent className="h-4 w-4 inline -mt-0.5 ml-1" />نسبة %</Button>
              <Button type="button" onClick={() => setForm({ ...form, type: "amount" })} className={cn("h-10 rounded-xl text-[13px] font-semibold border", form.type === "amount" ? "bg-primary-soft text-primary border-primary/30" : "bg-surface border-border/60")}>مبلغ ثابت</Button>
            </div>
          </Field>
          {form.type === "pct" ? (
            <Field label="نسبة الخصم %"><Input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} /></Field>
          ) : (
            <Field label="مبلغ الخصم (ج.م)"><Input type="number" value={form.discount_amount ?? ""} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} /></Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحد الأدنى للطلب"><Input type="number" value={form.min_order_total ?? ""} onChange={(e) => setForm({ ...form, min_order_total: e.target.value })} /></Field>
            <Field label="حد لكل عميل"><Input type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="مستوى العميل (VIP)">
              <select value={form.min_user_level} onChange={(e) => setForm({ ...form, min_user_level: e.target.value as Tier })} className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-[13.5px]">
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="إجمالي الاستخدام"><Input type="number" placeholder="∞" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></Field>
          </div>
          <Field label="تاريخ الانتهاء"><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl border border-border/60 text-[13px]">إلغاء</Button>
          <Button onClick={save} disabled={saving} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50">{saving ? "حفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
