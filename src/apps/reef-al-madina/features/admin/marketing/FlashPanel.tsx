import { useEffect, useMemo, useState } from "react";
import { Zap, Plus, Trash2, Calendar, Percent } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";
import { Kpi, Field } from "./shared";
import type { FlashSale, FlashSaleProduct, FlashProductForm } from "./types";
import { Button } from "@/components/ui/button";
import {
  getActiveFlashSaleFn,
  ensureActiveFlashSaleFn,
  upsertFlashSaleFn,
  deleteFlashSaleFn,
  endFlashSaleFn,
} from "@/core/marketing/marketing.functions";

const blankForm: FlashProductForm = {
  product_id: "", product_name: "", category: "",
  original_price: 0, discount_pct: 20, reason: "", rank: 0,
};

export default function FlashPanel() {
  const [products, setProducts] = useState<FlashSaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FlashSaleProduct | null>(null);
  const [activeSale, setActiveSale] = useState<FlashSale | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { sale, products } = await getActiveFlashSaleFn();
      setActiveSale((sale as unknown as FlashSale) ?? null);
      setProducts((products ?? []) as unknown as FlashSaleProduct[]);
    } catch {
      setActiveSale(null);
      setProducts([]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const ensureSale = async (): Promise<FlashSale | null> => {
    if (activeSale) return activeSale;
    try {
      const sale = (await ensureActiveFlashSaleFn()) as unknown as FlashSale;
      setActiveSale(sale);
      return sale;
    } catch {
      toast.error("تعذر إنشاء الحملة");
      return null;
    }
  };

  const remove = async (row: FlashSaleProduct) => {
    if (!confirm("إزالة من العرض؟")) return;
    try {
      await deleteFlashSaleFn({ data: { productId: row.id } });
      load();
    } catch { toast.error("فشل الحذف"); }
  };

  const endSale = async () => {
    if (!activeSale) return;
    if (!confirm("إنهاء حملة الفلاش الحالية؟")) return;
    try {
      await endFlashSaleFn({ data: { saleId: activeSale.id } });
      toast.success("تم إنهاء الحملة"); load();
    } catch { toast.error("فشل الإنهاء"); }
  };

  const metrics = useMemo(() => {
    const avgDisc = products.length
      ? products.reduce((s, p) => s + Number(p.discount_pct || 0), 0) / products.length
      : 0;
    return { count: products.length, avgDisc: avgDisc.toFixed(0), endsIn: activeSale?.ends_at ?? null };
  }, [products, activeSale]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
        <Kpi icon={Zap} label="منتجات في العرض" value={fmtNum(metrics.count)} tone="warning" />
        <Kpi icon={Percent} label="متوسط الخصم" value={`${metrics.avgDisc}%`} tone="success" />
        <Kpi icon={Calendar} label="ينتهي" value={metrics.endsIn ? new Date(metrics.endsIn).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "—"} tone="info" />
      </div>

      <div className="flex justify-between items-center gap-2 flex-wrap">
        {activeSale ? (
          <CountdownPill endsAt={activeSale.ends_at} />
        ) : (
          <span className="text-[12px] text-foreground-tertiary">لا توجد حملة نشطة — أضف منتجاً لبدء حملة جديدة.</span>
        )}
        <div className="flex items-center gap-2">
          {activeSale && <Button onClick={endSale} className="h-10 px-3 rounded-2xl border border-destructive/30 text-destructive text-[12.5px] font-semibold press">إنهاء الحملة</Button>}
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-[13px] font-semibold press inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> منتج للفلاش
          </Button>
        </div>
      </div>

      <section className="bg-surface rounded-3xl border border-border/50 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center"><Zap className="h-10 w-10 mx-auto mb-2 text-foreground-tertiary opacity-50" /><p className="font-display text-[15px]">لا توجد منتجات في الفلاش</p></div>
        ) : (
          <div className="divide-y divide-border/40">
            {products.map((p) => (
              <div key={p.id} className="px-4 lg:px-5 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] flex items-center justify-center shrink-0"><Zap className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[14px] truncate">{p.product_name ?? p.product_id}</p>
                  <p className="text-[11.5px] text-foreground-tertiary">من {fmtNum(p.original_price)} • خصم {p.discount_pct}%</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button onClick={() => remove(p)} className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 inline-flex items-center justify-center press"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <FlashDialog open={open} setOpen={setOpen} editing={editing} ensureSale={ensureSale} onSaved={load} />
    </div>
  );
}

function CountdownPill({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return <span className="text-[12px] text-destructive">انتهت الحملة</span>;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return (
    <div className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl bg-[hsl(var(--accent))]/10 border border-[hsl(var(--accent))]/30 text-[hsl(var(--accent))]">
      <Zap className="h-4 w-4" />
      <span className="font-display num text-[13px]">{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
    </div>
  );
}

function FlashDialog({
  open, setOpen, editing, ensureSale, onSaved,
}: {
  open: boolean; setOpen: (b: boolean) => void;
  editing: FlashSaleProduct | null;
  ensureSale: () => Promise<FlashSale | null>;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FlashProductForm>(blankForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        product_id: editing.product_id,
        product_name: editing.product_name ?? "",
        category: editing.category ?? "",
        original_price: editing.original_price,
        discount_pct: editing.discount_pct,
        reason: editing.reason ?? "",
        rank: editing.rank,
      });
    } else {
      setForm(blankForm);
    }
  }, [editing, open]);

  const save = async () => {
    if (!form.product_id || !form.original_price) { toast.error("المنتج والسعر مطلوبان"); return; }
    setSaving(true);
    const sale = await ensureSale();
    if (!sale) { setSaving(false); return; }
    const payload = {
      flash_sale_id: sale.id,
      product_id: form.product_id,
      product_name: form.product_name || null,
      category: form.category || null,
      original_price: Number(form.original_price),
      discount_pct: Number(form.discount_pct),
      reason: form.reason || null,
      rank: Number(form.rank) || 0,
    };
    try {
      await upsertFlashSaleFn({ data: { values: payload } });
      toast.success("تمت الإضافة"); setOpen(false); onSaved();
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>إضافة منتج لعرض الفلاش</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="معرّف المنتج"><Input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} placeholder="apple" /></Field>
          <Field label="اسم المنتج"><Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر الأصلي"><Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} /></Field>
            <Field label="نسبة الخصم %"><Input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} /></Field>
          </div>
          <Field label="القسم"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="meat" /></Field>
          <Field label="السبب / الوسم"><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="عرض اليوم" /></Field>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl border border-border/60 text-[13px]">إلغاء</Button>
          <Button onClick={save} disabled={saving} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50">{saving ? "حفظ..." : "إضافة"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
