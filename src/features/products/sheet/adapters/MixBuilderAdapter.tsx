/**
 * MixBuilderAdapter — split a target weight across multiple mix items.
 * Disables the CTA until the split sums to 100%.
 */
import { memo, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import type { MixCapability, MixItem } from "../../types/capabilities";
import type { AdapterResult } from "./types";

interface Props {
  readonly product: Product;
  readonly capability: MixCapability;
  readonly onChange: (r: AdapterResult) => void;
}

const normaliseItems = (raw: ReadonlyArray<MixItem | string>): MixItem[] =>
  raw.map((it, i) =>
    typeof it === "string" ? { id: `mix-${i}`, name: it } : { ...it },
  );

const MixBuilderAdapterImpl = ({ product, capability, onChange }: Props) => {
  const items = useMemo(() => normaliseItems(capability.mix_items), [capability.mix_items]);
  const target = capability.target_grams ?? 1000;

  const [shares, setShares] = useState<Record<string, number>>(() => {
    const equal = items.length > 0 ? Math.floor(100 / items.length) : 0;
    const init: Record<string, number> = {};
    items.forEach((it, i) => {
      init[it.id] = i === items.length - 1 ? 100 - equal * (items.length - 1) : equal;
    });
    return init;
  });

  const total = items.reduce((sum, it) => sum + (shares[it.id] ?? 0), 0);
  const remaining = 100 - total;

  const totalPrice = useMemo(
    () => Math.round((product.price * target) / 1000),
    [product.price, target],
  );

  useEffect(() => {
    const composition = items.map((it) => ({
      id: it.id,
      name: it.name,
      grams: Math.round((target * (shares[it.id] ?? 0)) / 100),
      pct: shares[it.id] ?? 0,
    }));
    onChange({
      qty: 1,
      unitPrice: totalPrice,
      total: totalPrice,
      disabled: total !== 100,
      disabledReason:
        total > 100 ? `تجاوزت 100% بمقدار ${total - 100}%` : `أكمل ${100 - total}% المتبقية`,
      meta: {
        properties: { mix_target_grams: target, mix: composition },
        unitPrice: totalPrice,
      },
    });
  }, [items, shares, target, total, totalPrice, onChange]);

  const setShare = (id: string, raw: number) => {
    const v = Math.max(0, Math.min(100, Math.round(raw)));
    setShares((prev) => ({ ...prev, [id]: v }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">
          الخلطة · {target >= 1000 ? `${(target / 1000).toLocaleString("ar-EG")} كجم` : `${target} جم`}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            total === 100
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
        >
          {total}% / 100%
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/5">
        <div
          className={`h-full transition-all ${
            total === 100 ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${Math.min(100, total)}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((it) => {
          const pct = shares[it.id] ?? 0;
          const grams = Math.round((target * pct) / 100);
          return (
            <div
              key={it.id}
              className="rounded-2xl bg-foreground/5 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground">
                  {it.emoji && <span className="me-1">{it.emoji}</span>}
                  {it.name}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {grams} جم · {pct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setShare(it.id, Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
          );
        })}
      </div>

      {remaining !== 0 && (
        <p className="text-center text-[11px] font-bold text-amber-600">
          {remaining > 0 ? `أكمل ${remaining}% للوصول إلى 100%` : `قلل ${-remaining}% لتعود إلى 100%`}
        </p>
      )}
    </div>
  );
};

export const MixBuilderAdapter = memo(MixBuilderAdapterImpl);
MixBuilderAdapter.displayName = "MixBuilderAdapter";
