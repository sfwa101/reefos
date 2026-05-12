import { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Image as ImageIcon, Plus, Trash2, Pencil, Power, Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Kpi, Field } from "./shared";
import { PLACEMENTS, type Banner, type BannerForm } from "./types";
import {
  listBannersFn,
  upsertBannerFn,
  setBannerActiveFn,
  deleteBannerFn,
} from "@/lib/marketing.functions";

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
    const { data } = await supabase.from(TABLE).select("*").order("sort_order", { ascending: true });
    setRows((data ?? []) as Banner[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.is_active).length,
    hero: rows.filter((r) => r.placement === "hero").length,
  }), [rows]);

  const toggleActive = async (row: Banner) => {
    const { error } = await supabase.from(TABLE).update({ is_active: !row.is_active } as never).eq("id", row.id);
    if (error) toast.error("تعذر التحديث"); else { toast.success(row.is_active ? "تم الإيقاف" : "تم التفعيل"); load(); }
  };
  const remove = async (row: Banner) => {
    if (!confirm("حذف البانر؟")) return;
    const { error } = await supabase.from(TABLE).delete().eq("id", row.id);
    if (error) toast.error("فشل الحذف"); else { toast.success("تم الحذف"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
        <Kpi icon={ImageIcon} label="إجمالي البانرات" value={fmtNum(metrics.total)} tone="primary" />
        <Kpi icon={Power} label="بانرات نشطة" value={fmtNum(metrics.active)} tone="success" />
        <Kpi icon={Megaphone} label="في الواجهة الرئيسية" value={fmtNum(metrics.hero)} tone="info" />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-[13px] font-semibold press inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> بانر جديد
        </button>
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
                  <button onClick={() => toggleActive(r)} className="h-8 w-8 rounded-xl border border-border/60 inline-flex items-center justify-center press"><Power className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { setEditing(r); setOpen(true); }} className="h-8 w-8 rounded-xl bg-primary-soft text-primary border border-primary/20 inline-flex items-center justify-center press"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(r)} className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 inline-flex items-center justify-center press"><Trash2 className="h-3.5 w-3.5" /></button>
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
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("marketing-banners").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error("فشل الرفع"); setUploading(false); return; }
    const { data } = supabase.storage.from("marketing-banners").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("تم رفع الصورة");
  };

  const save = async () => {
    if (!form.title || !form.image_url) { toast.error("العنوان والصورة مطلوبان"); return; }
    setSaving(true);
    const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
    const res = editing
      ? await supabase.from(TABLE).update(payload as never).eq("id", editing.id)
      : await supabase.from(TABLE).insert(payload as never);
    setSaving(false);
    if (res.error) toast.error("فشل الحفظ"); else { toast.success("تم الحفظ"); setOpen(false); onSaved(); }
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
              <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })} className={cn("w-full h-10 rounded-md text-[13px] font-semibold border", form.is_active ? "bg-success/10 text-success border-success/20" : "bg-surface-muted border-border/60")}>{form.is_active ? "نشط" : "موقوف"}</button>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl border border-border/60 text-[13px]">إلغاء</button>
          <button onClick={save} disabled={saving} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50">{saving ? "حفظ..." : "حفظ"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
