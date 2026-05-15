import { useRef } from "react";
import { ImageIcon, Loader2, Upload, ShieldCheck } from "lucide-react";
import { Field, Label, Toggle, inputCls } from "./primitives";
import { SOURCES, BADGES, type ProductRow, type ProductMetadata, type ProductMetadataValue } from "./types";
import SmartTagSuggester from "./SmartTagSuggester";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const rawAliases = form.metadata?.aliases;
  const aliases: readonly string[] = Array.isArray(rawAliases)
    ? rawAliases.filter((x): x is string => typeof x === "string")
    : typeof rawAliases === "string"
      ? rawAliases.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const setAliases = (next: string[]) => {
    const meta: ProductMetadata = { ...(form.metadata ?? {}) };
    if (next.length === 0) {
      delete meta.aliases;
    } else {
      meta.aliases = next;
    }
    update("metadata", meta);
  };

  /* ---------------- Phase 10 — exclusion flags ---------------- */
  const excludeFromDiscounts = form.metadata?.excludeFromDiscounts === true;
  const excludeFromLoyalty = form.metadata?.excludeFromLoyalty === true;
  const exclusionMessage =
    typeof form.metadata?.exclusionMessage === "string"
      ? form.metadata.exclusionMessage
      : "";

  const setMetaFlag = (key: keyof ProductMetadata, value: ProductMetadataValue) => {
    const meta: ProductMetadata = { ...(form.metadata ?? {}) };
    if (value === false || value === null || value === "" ) {
      delete meta[key];
    } else {
      meta[key] = value;
    }
    update("metadata", meta);
  };

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
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-2 press disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع صورة
            </Button>
            <Input
              value={form.image_url ?? ""}
              onChange={(e) => update("image_url", e.target.value)}
              placeholder="أو الصق رابط صورة"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <Field label="الاسم *">
        <Input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputCls} />
      </Field>

      <SmartTagSuggester
        productName={form.name}
        aliases={aliases}
        onChange={setAliases}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="القسم *">
          <select value={form.source} onChange={(e) => update("source", e.target.value)} className={inputCls}>
            {SOURCES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </Field>
        <Field label="الفئة *">
          <Input
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
          <Input value={form.brand ?? ""} onChange={(e) => update("brand", e.target.value)} className={inputCls} />
        </Field>
        <Field label="الوحدة">
          <Input value={form.unit} onChange={(e) => update("unit", e.target.value)} placeholder="قطعة / كجم / لتر" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="الفئة الفرعية">
          <Input value={form.sub_category ?? ""} onChange={(e) => update("sub_category", e.target.value || null)} className={inputCls} />
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

      {/* ---------- Phase 10 — Exclusion Controls ---------- */}
      <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/15 p-3 space-y-3">
        <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-amber-800 dark:text-amber-300">
          <ShieldCheck className="h-4 w-4" />
          استثناءات السعر والولاء
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Toggle
            checked={excludeFromDiscounts}
            onChange={(v) => setMetaFlag("excludeFromDiscounts", v ? true : null)}
            label="استثناء من الخصومات"
          />
          <Toggle
            checked={excludeFromLoyalty}
            onChange={(v) => setMetaFlag("excludeFromLoyalty", v ? true : null)}
            label="استثناء من نقاط الولاء"
          />
        </div>
        {(excludeFromDiscounts || excludeFromLoyalty) && (
          <Field label="رسالة الاستثناء (تظهر للعميل في السلة)">
            <Input
              value={exclusionMessage}
              onChange={(e) => setMetaFlag("exclusionMessage", e.target.value)}
              placeholder="هذا المنتج يتمتع بأفضل سعر بيع مباشر…"
              className={inputCls}
              maxLength={120}
            />
          </Field>
        )}
      </div>
    </div>
  );
};

export default BasicInfoForm;
