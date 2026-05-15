import { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Image as ImageIcon, Plus, Trash2, Pencil, Power, Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Kpi, Field } from "./shared";
import { PLACEMENTS, type Banner, type BannerForm } from "./types";
import { Button } from "@/components/ui/button";
import {
  listBannersFn,
  upsertBannerFn,
  setBannerActiveFn,
  deleteBannerFn,
  uploadBannerImageFn,
} from "@/core/marketing/marketing.functions";

const blankForm: BannerForm = {
  title: "", subtitle: "", image_url: "", placement: "hero",
  link_url: "", category_slug: "", sort_order: 0, is_active: true,
};

export default function BannersPanel() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await listBannersFn()); } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.is_active).length,
    hero: rows.filter((r) => r.placement === "hero").length,
  }), [rows]);

  const toggleActive = async (row: Banner) => {
    try {
      await setBannerActiveFn({ data: { id: row.id, is_active: !row.is_active } });
      toast.success(row.is_active ? "تم الإيقاف" : "تم التفعيل"); load();
    } catch { toast.error("تعذر التحديث"); }
  };
  const remove = async (row: Banner) => {
    if (!confirm("حذف البانر؟")) return;
    try { await deleteBannerFn({ data: { id: row.id } }); toast.success("تم الحذف"); load(); }
    catch { toast.error("فشل الحذف"); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
        <Kpi icon={ImageIcon} label="إجمالي البانرات" value={fmtNum(metrics.total)} tone="primary" />
        <Kpi icon={Power} label="بانرات نشطة" value={fmtNum(metrics.active)} tone="success" />
        <Kpi icon={Megaphone} label="في الواجهة الرئيسية" value={fmtNum(metrics.hero)} tone="info" />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-[13px] font-semibold press inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> بانر جديد
        </Button>
      </div>

      <section className="bg-surface rounded-3xl border border-border/50 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 text-foreground-tertiary opacity-50" />
            <p className="font-display text-[15px]">لا توجد بانرات</p>
            <p className="text-[12px] text-foreground-tertiary mt-1">ابدأ بإضافة أول بانر ترويجي</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map((r) => (
              <div key={r.id} className="px-4 lg:px-5 py-3 flex items-center gap-3">
                <div className="h-14 w-20 rounded-xl overflow-hidden bg-surface-muted shrink-0 border border-border/50">
                  {r.image_url
                    ? <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-foreground-tertiary" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[14px] truncate">{r.title}</p>
                  <p className="text-[11.5px] text-foreground-tertiary truncate">
                    {PLACEMENTS.find((p) => p.value === r.placement)?.label ?? r.placement}
                    {r.link_url && " • " + r.link_url}
                  </p>
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

      <BannerDialog open={open} setOpen={setOpen} editing={editing} onSaved={load} />
    </div>
  );
}

function BannerDialog({
  open, setOpen, editing, onSaved,
}: { open: boolean; setOpen: (b: boolean) => void; editing: Banner | null; onSaved: () => void }) {
  const [form, setForm] = useState<BannerForm>(blankForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      const { created_at: _c, updated_at: _u, ...rest } = editing;
      setForm({ ...rest });
    } else {
      setForm(blankForm);
    }
  }, [editing, open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const { publicUrl } = await uploadBannerImageFn({
        data: { filename: file.name, contentType: file.type || "image/png", base64 },
      });
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error((e as Error).message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title || !form.image_url) { toast.error("العنوان والصورة مطلوبان"); return; }
    setSaving(true);
    try {
      await upsertBannerFn({
        data: {
          id: editing?.id ?? null,
          values: { ...form, sort_order: Number(form.sort_order) || 0 },
        },
      });
      toast.success("تم الحفظ"); setOpen(false); onSaved();
    } catch (e) { toast.error((e as Error).message || "فشل الحفظ"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "تعديل البانر" : "بانر جديد"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="الصورة">
            <div className="space-y-2">
              {form.image_url && <img src={form.image_url} alt="" className="w-full h-32 object-cover rounded-xl border border-border/50" />}
              <label className="flex items-center justify-center h-10 rounded-xl border border-dashed border-border bg-surface cursor-pointer text-[13px] press">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : (form.image_url ? "تغيير الصورة" : "رفع صورة")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </div>
          </Field>
          <Field label="العنوان"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="العنوان الفرعي"><Input value={form.subtitle ?? ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
          <Field label="مكان الظهور">
            <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-[13.5px]">
              {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="رابط الانتقال (اختياري)"><Input placeholder="/store/meat" value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الترتيب"><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            <Field label="الحالة">
              <Button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })} className={cn("w-full h-10 rounded-md text-[13px] font-semibold border", form.is_active ? "bg-success/10 text-success border-success/20" : "bg-surface-muted border-border/60")}>{form.is_active ? "نشط" : "موقوف"}</Button>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl border border-border/60 text-[13px]">إلغاء</Button>
          <Button onClick={save} disabled={saving} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50">{saving ? "حفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
