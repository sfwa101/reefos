import { Plus, Trash2 } from "lucide-react";
import { inputCls } from "./primitives";
import type { ProductAddonRow, ProductVariantRow } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RowConfig<T> {
  title: string;
  hint: string;
  emptyText: string;
  items: T[];
  onAdd: () => void;
  onUpdate: (i: number, patch: Partial<T>) => void;
  onRemove: (i: number) => void;
  labelKey: keyof T;
  numericKey: keyof T;
  numericPlaceholder: string;
}

function RowList<T extends { id: string }>({
  title, hint, emptyText, items, onAdd, onUpdate, onRemove,
  labelKey, numericKey, numericPlaceholder,
}: RowConfig<T>) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold">{title}</p>
          <p className="text-[11px] text-foreground-tertiary">{hint}</p>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          className="h-9 px-3 rounded-xl bg-primary/10 text-primary text-[12px] font-semibold flex items-center gap-1 press"
        >
          <Plus className="h-3.5 w-3.5" /> إضافة
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-foreground-tertiary text-center py-3">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((row, i) => (
            <div key={row.id} className="flex items-center gap-2">
              <Input
                value={(row[labelKey] as unknown as string) ?? ""}
                onChange={(e) => onUpdate(i, { [labelKey]: e.target.value } as Partial<T>)}
                placeholder="الاسم"
                className={inputCls + " flex-1"}
              />
              <Input
                type="number" step="0.01"
                value={(row[numericKey] as unknown as number) ?? 0}
                onChange={(e) => onUpdate(i, { [numericKey]: Number(e.target.value) || 0 } as Partial<T>)}
                placeholder={numericPlaceholder}
                className={inputCls + " w-24 num text-right"}
              />
              <Button
                type="button"
                onClick={() => onRemove(i)}
                className="h-11 w-11 rounded-xl bg-destructive/10 text-destructive press flex items-center justify-center shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface OptionsBuilderProps {
  variants: ProductVariantRow[];
  addons: ProductAddonRow[];
  addVariant: () => void;
  updateVariant: (i: number, patch: Partial<ProductVariantRow>) => void;
  removeVariant: (i: number) => void;
  addAddon: () => void;
  updateAddon: (i: number, patch: Partial<ProductAddonRow>) => void;
  removeAddon: (i: number) => void;
}

const OptionsBuilder = ({
  variants, addons, addVariant, updateVariant, removeVariant,
  addAddon, updateAddon, removeAddon,
}: OptionsBuilderProps) => (
  <div className="space-y-4 mt-0">
    <RowList<ProductVariantRow>
      title="خيارات / Variants"
      hint="مثل: حجم كبير (+10 ج.م)، نصف كيلو، إلخ"
      emptyText="لا توجد خيارات."
      items={variants}
      onAdd={addVariant}
      onUpdate={updateVariant}
      onRemove={removeVariant}
      labelKey="label"
      numericKey="priceDelta"
      numericPlaceholder="±سعر"
    />
    <RowList<ProductAddonRow>
      title="إضافات / Add-ons"
      hint="صوص زيادة، جبنة، إلخ — تضاف لسعر الأساسي"
      emptyText="لا توجد إضافات."
      items={addons}
      onAdd={addAddon}
      onUpdate={updateAddon}
      onRemove={removeAddon}
      labelKey="label"
      numericKey="price"
      numericPlaceholder="السعر"
    />
  </div>
);

export default OptionsBuilder;
