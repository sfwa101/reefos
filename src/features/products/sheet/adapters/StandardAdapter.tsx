/**
 * StandardAdapter — qty stepper + variant chips for ordinary SKUs.
 * Reports a normalised AdapterResult to the parent SmartProductSheet.
 */
import { memo, useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/products";
import type { AdapterResult } from "./types";

interface Props {
  readonly product: Product;
  readonly onChange: (r: AdapterResult) => void;
}

const StandardAdapterImpl = ({ product, onChange }: Props) => {
  const variants = product.variants ?? [];
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | undefined>(
    variants[0]?.id,
  );

  const activeVariant: ProductVariant | undefined = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId],
  );

  useEffect(() => {
    const unitPrice = product.price + (activeVariant?.priceDelta ?? 0);
    onChange({
      qty,
      unitPrice,
      total: unitPrice * qty,
      meta: {
        variantId: activeVariant?.id,
        unitPrice,
        properties: activeVariant
          ? { variantLabel: activeVariant.label }
          : undefined,
      },
    });
  }, [qty, activeVariant, product.price, onChange]);

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground">الحجم / الخيار</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const active = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ease-apple ${
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                  }`}
                >
                  {v.label}
                  {v.priceDelta !== 0 && (
                    <span className="ms-1 text-[10px] opacity-80">
                      ({v.priceDelta > 0 ? "+" : ""}
                      {v.priceDelta} ج)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-foreground/5 p-3">
        <span className="text-xs font-bold text-muted-foreground">الكمية</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="نقص"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground active:scale-95"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
          </button>
          <span className="min-w-[2rem] text-center text-base font-extrabold tabular-nums">
            {qty.toLocaleString("ar-EG")}
          </span>
          <button
            type="button"
            aria-label="زيادة"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            className="grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const StandardAdapter = memo(StandardAdapterImpl);
StandardAdapter.displayName = "StandardAdapter";
