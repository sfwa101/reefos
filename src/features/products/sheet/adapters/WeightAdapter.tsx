/**
 * WeightAdapter — preset weight chips + free input. Price scales linearly
 * by grams (price-per-kg is `product.price`).
 */
import { memo, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import type { WeightCapability } from "../../types/capabilities";
import type { AdapterResult } from "./types";

interface Props {
  readonly product: Product;
  readonly capability: WeightCapability;
  readonly onChange: (r: AdapterResult) => void;
}

const DEFAULT_PRESETS: ReadonlyArray<number> = [250, 500, 1000, 1500];

const WeightAdapterImpl = ({ product, capability, onChange }: Props) => {
  const presets = capability.preset_grams ?? DEFAULT_PRESETS;
  const [grams, setGrams] = useState<number>(presets[1] ?? 500);

  const total = useMemo(
    () => Math.round((product.price * grams) / 1000),
    [product.price, grams],
  );

  useEffect(() => {
    onChange({
      qty: 1,
      unitPrice: total,
      total,
      meta: {
        properties: { weight_grams: grams },
        unitPrice: total,
      },
    });
  }, [grams, total, onChange]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted-foreground">
        الوزن المطلوب · سعر الكيلو {Math.round(product.price).toLocaleString("ar-EG")} ج
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.map((g) => {
          const active = g === grams;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGrams(g)}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ease-apple ${
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-foreground/5 text-foreground hover:bg-foreground/10"
              }`}
            >
              {g >= 1000 ? `${(g / 1000).toLocaleString("ar-EG")} كجم` : `${g} جم`}
            </button>
          );
        })}
      </div>
      <label className="block">
        <span className="text-[11px] text-muted-foreground">أو أدخل وزناً مخصصاً (جم)</span>
        <input
          type="number"
          inputMode="numeric"
          min={50}
          max={50000}
          step={50}
          value={grams}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n > 0) setGrams(Math.min(50000, Math.max(50, n)));
          }}
          className="mt-1 w-full rounded-xl bg-foreground/5 px-3 py-2 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>
    </div>
  );
};

export const WeightAdapter = memo(WeightAdapterImpl);
WeightAdapter.displayName = "WeightAdapter";
