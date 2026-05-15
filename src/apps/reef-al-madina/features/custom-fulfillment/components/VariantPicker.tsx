// Presentational variant + addons picker for the sweets product sheet.
// Pure UI — receives state and setters via props; no business logic.

import { Check, PackageCheck, Sparkles } from "lucide-react";
import { toLatin } from "@/lib/format";
import type { Product } from "@/core/catalog/legacyProduct.types";
import { Button } from "@/components/ui/button";

type Variant = NonNullable<Product["variants"]>[number];
type Addon = NonNullable<Product["addons"]>[number];

type Props = {
  variants: Variant[];
  addons: Addon[];
  variantId: string;
  addonIds: string[];
  onVariantChange: (id: string) => void;
  onToggleAddon: (id: string) => void;
};

export const VariantPicker = ({
  variants, addons, variantId, addonIds, onVariantChange, onToggleAddon,
}: Props) => (
  <>
    {variants.length > 0 && (
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-extrabold">اختر الحجم</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {variants.map((v) => {
            const active = v.id === variantId;
            const delta = v.priceDelta;
            return (
              <Button
                key={v.id}
                onClick={() => onVariantChange(v.id)}
                className={`flex items-center justify-between gap-3 rounded-[14px] border-2 px-3 py-2.5 text-right transition ${
                  active ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-border bg-background"
                }`}
              >
                <span className="flex items-center gap-2 text-[12px] font-extrabold">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    active ? "border-violet-500 bg-violet-500" : "border-muted-foreground/40"
                  }`}>
                    {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                  </span>
                  {v.label}
                </span>
                <span className="text-[11px] font-extrabold tabular-nums text-violet-700 dark:text-violet-300">
                  {delta === 0 ? "السعر الأساسي" : delta > 0 ? `+${toLatin(delta)} ج.م` : `${toLatin(delta)} ج.م`}
                </span>
              </Button>
            );
          })}
        </div>
      </section>
    )}

    {addons.length > 0 && (
      <section>
        <div className="mb-2 flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-extrabold">
            إضافات{" "}
            <span className="text-[10px] font-bold text-muted-foreground">(اختياري)</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {addons.map((a) => {
            const active = addonIds.includes(a.id);
            return (
              <Button
                key={a.id}
                onClick={() => onToggleAddon(a.id)}
                className={`flex items-center justify-between gap-3 rounded-[14px] border-2 px-3 py-2.5 text-right transition ${
                  active ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-border bg-background"
                }`}
              >
                <span className="flex items-center gap-2 text-[12px] font-extrabold">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] border-2 ${
                    active ? "border-violet-500 bg-violet-500" : "border-muted-foreground/40"
                  }`}>
                    {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                  </span>
                  {a.label}
                </span>
                <span className="text-[11px] font-extrabold tabular-nums text-violet-700 dark:text-violet-300">
                  +{toLatin(a.price)} ج.م
                </span>
              </Button>
            );
          })}
        </div>
      </section>
    )}
  </>
);
