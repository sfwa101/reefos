import { useRef } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { Field, Label, Toggle, inputCls } from "./primitives";
import { SOURCES, BADGES, type ProductRow, type ProductMetadata } from "./types";
import SmartTagSuggester from "./SmartTagSuggester";

export interface BasicInfoFormProps {
  form: ProductRow;
  update: <K extends keyof ProductRow>(k: K, v: ProductRow[K]) => void;
  uploading: boolean;
  onUpload: (file: File) => void;
  categories: { id: string; name: string; icon: string | null }[];
  stores: { id: string; name: string }[];
}

const BasicInfoForm = ({
  form, update, uploading, onUpload, categories, stores,
}: BasicInfoFormProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4 mt-0">
      <div>
        <Label>صورة المنتج</Label>
        <div className="flex items-center gap-3">
          <div className="h-24 w-24 rounded-2xl bg-surface-muted overflow-hidden flex items-center justify-center border border-border/40 shrink-0">
            {form.image_url || form.image ? (
              <img src={form.image_url || form.image || ""} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-foreground-tertiary opacity-40" />
            )}
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-2 press disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع صورة
            </button>
            <input
              value={form.image_url ?? ""}
              onChange={(e) => update("image_url", e.target.value)}
              placeholder="أو الصق رابط صورة"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <Field label="الاسم *">
        <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="القسم *">
          <select value={form.source} onChange={(e) => update("source", e.target.value)} className={inputCls}>
            {SOURCES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </Field>
        <Field label="الفئة *">
          <input
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            list="cat-list"
            className={inputCls}
          />
          <datalist id="cat-list">
            {categories.map((c) => <option key={c.id} value={c.name} />)}
          </datalist>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="العلامة التجارية">
          <input value={form.brand ?? ""} onChange={(e) => update("brand", e.target.value)} className={inputCls} />
        </Field>
        <Field label="الوحدة">
          <input value={form.unit} onChange={(e) => update("unit", e.target.value)} placeholder="قطعة / كجم / لتر" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="الفئة الفرعية">
          <input value={form.sub_category ?? ""} onChange={(e) => update("sub_category", e.target.value || null)} className={inputCls} />
        </Field>
        <Field label="الشارة">
          <select value={form.badge ?? ""} onChange={(e) => update("badge", e.target.value || null)} className={inputCls}>
            {BADGES.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
          </select>
        </Field>
      </div>

      <Field label="المتجر">
        <select value={form.store_id ?? ""} onChange={(e) => update("store_id", e.target.value || null)} className={inputCls}>
          <option value="">— بدون —</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>

      <Field label="الوصف">
        <textarea
          value={form.description ?? ""}
          onChange={(e) => update("description", e.target.value || null)}
          rows={3}
          className={inputCls + " resize-none py-2 h-auto"}
        />
      </Field>

      <div className="flex items-center gap-3 flex-wrap">
        <Toggle checked={form.is_active} onChange={(v) => update("is_active", v)} label="نشط" />
        <Toggle
          checked={form.perishable === true}
          onChange={(v) => update("perishable", v ? true : null)}
          label="قابل للتلف"
        />
      </div>
    </div>
  );
};

export default BasicInfoForm;
