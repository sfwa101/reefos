import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import {
  listProductPartnersFn, listPartnerLedgersFn, createProductPartnerFn,
  setProductPartnerActiveFn, markPartnerLedgerPaidFn,
  updateProductPartnerFn, deleteProductPartnerFn,
  type ProductPartnerRow, type PartnerLedgerRow,
} from "@/core/finance/finance.functions";
import { fmtMoney } from "@/lib/format";
import { Loader2, ShieldAlert, Plus, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = { id: string; name: string };

export default function Partners() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance");
  const listPartners = useServerFn(listProductPartnersFn);
  const listLedger = useServerFn(listPartnerLedgersFn);
  const createPartner = useServerFn(createProductPartnerFn);
  const togglePartnerFn = useServerFn(setProductPartnerActiveFn);
  const updatePartnerFn = useServerFn(updateProductPartnerFn);
  const deletePartnerFn = useServerFn(deleteProductPartnerFn);
  const markPaidFn = useServerFn(markPartnerLedgerPaidFn);

  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<ProductPartnerRow[]>([]);
  const [ledger, setLedger] = useState<PartnerLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: "", partner_name: "", partner_phone: "", split_type: "net_profit", percentage: "10" });

  const load = async () => {
    setLoading(true);
    try {
      const [sov, pp, pl] = await Promise.all([
        import("@/core/commerce/knowledge/sovereignCatalog").then((m) => m.fetchAdminCatalog()),
        listPartners(),
        listLedger(),
      ]);
      setProducts(sov.map((r) => ({ id: r.id, name: r.name })) as Product[]);
      setPartners(pp);
      setLedger(pl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (allowed) load(); else setLoading(false); /* eslint-disable-next-line */ }, [allowed]);

  const create = async () => {
    try {
      await createPartner({ data: {
        product_id: form.product_id,
        partner_name: form.partner_name,
        partner_phone: form.partner_phone || null,
        split_type: form.split_type,
        percentage: parseFloat(form.percentage),
      }});
      toast.success("تم");
      setForm({ product_id: "", partner_name: "", partner_phone: "", split_type: "net_profit", percentage: "10" });
      setShowForm(false);
      load();
    } catch (e) {
      const msg = (e as Error).message;
      const map: Record<string, string> = {
        product_required: "اختر المنتج", name_required: "اسم الشريك مطلوب",
        invalid_pct: "نسبة غير صالحة", invalid_split: "نوع التقسيم غير صالح",
      };
      toast.error(map[msg] ?? msg);
    }
  };

  const togglePartner = async (id: string, current: boolean) => {
    try {
      await togglePartnerFn({ data: { id, is_active: !current } });
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const markPaid = async (id: string) => {
    try {
      await markPaidFn({ data: { id } });
      toast.success("تم تسجيل الدفع");
      load();
    } catch (e) {
      toast.error("فشل: " + (e as Error).message);
    }
  };

  const editPartner = async (p: ProductPartnerRow) => {
    const pctRaw = window.prompt(`النسبة الجديدة لـ "${p.partner_name}" (0-100):`, String(p.percentage));
    if (pctRaw === null) return;
    const pct = parseFloat(pctRaw);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return toast.error("نسبة غير صالحة");
    const splitRaw = window.prompt('نوع التقسيم: net_profit / gross_profit / revenue', p.split_type);
    if (splitRaw === null) return;
    try {
      await updatePartnerFn({ data: { id: p.id, percentage: pct, split_type: splitRaw } });
      toast.success("تم التحديث");
      load();
    } catch (e) {
      const msg = (e as Error).message;
      const map: Record<string, string> = { invalid_pct: "نسبة غير صالحة", invalid_split: "نوع تقسيم غير صالح" };
      toast.error(map[msg] ?? msg);
    }
  };

  const removePartner = async (p: ProductPartnerRow) => {
    if (!confirm(`حذف الشريك "${p.partner_name}"؟ سيتم تعطيله.`)) return;
    try {
      await deletePartnerFn({ data: { id: p.id } });
      toast.success("تم الحذف");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (rolesLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed) return (<><MobileTopbar title="الشركاء" /><div className="p-8 text-center" dir="rtl"><ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" /><p>غير متاح</p></div></>);

  const totalDue = ledger.filter((l) => l.status === "accrued").reduce((s, l) => s + Number(l.amount_due || 0), 0);

  return (
    <>
      <MobileTopbar title="شركاء المنتجات" />
      <div className="px-4 lg:px-6 py-4 max-w-3xl mx-auto space-y-4" dir="rtl">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
          <p className="text-[12px] text-foreground-tertiary">مستحقات الشركاء (لم تُدفع)</p>
          <p className="font-display text-[24px] mt-1">{fmtMoney(totalDue)}</p>
        </div>

        <Button onClick={() => setShowForm(!showForm)} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? "إخفاء" : "إضافة شريك لمنتج"}
        </Button>

        {showForm && (
          <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-2">
            <select className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">— اختر منتج —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="اسم الشريك" value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} />
            <Input className="w-full bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="هاتف" value={form.partner_phone} onChange={(e) => setForm({ ...form, partner_phone: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="bg-muted rounded-lg px-3 py-2 text-[14px]" value={form.split_type} onChange={(e) => setForm({ ...form, split_type: e.target.value })}>
                <option value="net_profit">صافي الربح</option>
                <option value="gross_profit">إجمالي الربح</option>
                <option value="revenue">الإيراد</option>
              </select>
              <Input className="bg-muted rounded-lg px-3 py-2 text-[14px]" placeholder="نسبة %" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} />
            </div>
            <Button onClick={create} className="w-full bg-primary text-primary-foreground rounded-lg py-2 font-medium">حفظ</Button>
          </div>
        )}

        <div>
          <p className="text-[12px] font-medium text-foreground-tertiary px-1 mb-2">الشركاء النشطون</p>
          <div className="space-y-2">
            {partners.map((p) => (
              <div key={p.id} className="bg-surface rounded-xl p-3 border border-border/40 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Users className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14px] truncate">{p.partner_name}</p>
                  <p className="text-[11px] text-foreground-tertiary truncate">{p.products?.name} • {p.percentage}% من {p.split_type === "net_profit" ? "صافي الربح" : p.split_type === "gross_profit" ? "إجمالي الربح" : "الإيراد"}</p>
                </div>
                <Button onClick={() => editPartner(p)} className="text-[11px] p-1.5 rounded-lg bg-info/10 text-info" aria-label="تعديل">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button onClick={() => togglePartner(p.id, p.is_active)} className={`text-[11px] px-2 py-1 rounded-lg ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-foreground-tertiary"}`}>
                  {p.is_active ? "نشط" : "موقوف"}
                </Button>
                <Button onClick={() => removePartner(p)} className="text-[11px] p-1.5 rounded-lg bg-destructive/10 text-destructive" aria-label="حذف">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[12px] font-medium text-foreground-tertiary px-1 mb-2">آخر المستحقات</p>
          <div className="space-y-2">
            {ledger.map((l) => (
              <div key={l.id} className="bg-surface rounded-xl p-3 border border-border/40 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[13px] truncate">{l.partner_name}</p>
                  <p className="text-[11px] text-foreground-tertiary truncate">{l.product_name} • {new Date(l.created_at).toLocaleDateString("ar-EG")}</p>
                </div>
                <p className="font-display text-[13px]">{fmtMoney(l.amount_due)}</p>
                {l.status === "accrued" ? (
                  <Button onClick={() => markPaid(l.id)} className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary">دفع</Button>
                ) : (
                  <span className="text-[11px] px-2 py-1 rounded-lg bg-success/10 text-success">{l.status === "paid" ? "مدفوع" : l.status}</span>
                )}
              </div>
            ))}
            {ledger.length === 0 && <p className="text-center text-foreground-tertiary py-6 text-[13px]">لا توجد مستحقات بعد</p>}
          </div>
        </div>
      </div>
    </>
  );
}
