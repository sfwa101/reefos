/**
 * SmartProductSheet — Apple Glass product sheet with capability-driven adapters.
 * --------------------------------------------------------------------------
 * Visual: backdrop-blur-xl bottom sheet with a parallax hero image.
 * Logic: picks an adapter based on `metadata.capabilities.type`:
 *   • standard       → variants + qty stepper
 *   • weight_based   → preset weight chips + custom input
 *   • mix_and_match  → progress-bar mix builder
 *
 * Bulk pricing tiers from `metadata.bulk_pricing` are surfaced live above
 * the CTA. Cost price stays hidden from the customer.
 */
import { memo, useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCartActions } from "@/context/CartContext";
import { readProductIntelligence } from "../types/capabilities";
import { DynamicBadges } from "../components/DynamicBadges";
import { StandardAdapter } from "./adapters/StandardAdapter";
import { WeightAdapter } from "./adapters/WeightAdapter";
import { MixBuilderAdapter } from "./adapters/MixBuilderAdapter";
import type { AdapterResult } from "./adapters/types";

interface Props {
  readonly product: Product;
  readonly open: boolean;
  readonly onClose: () => void;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ar-EG")} ج`;

const SmartProductSheetImpl = ({ product, open, onClose }: Props) => {
  const intel = readProductIntelligence(product.metadata);
  const { add } = useCartActions();

  const [result, setResult] = useState<AdapterResult>({
    qty: 1,
    unitPrice: product.price,
    total: product.price,
  });

  // Lock body scroll while sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleAdapterChange = useCallback((r: AdapterResult) => {
    setResult(r);
  }, []);

  if (!open) return null;

  // Apply best-matching bulk tier to the live total.
  const applicableTier = [...intel.bulkTiers]
    .reverse()
    .find((t) => result.qty >= t.min_qty);
  const discounted = applicableTier
    ? Math.round(result.total * (1 - applicableTier.discount_pct / 100))
    : result.total;
  const savings = result.total - discounted;

  const handleAdd = () => {
    if (result.disabled) return;
    add(product, result.qty, result.meta);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-t-[28px] border border-white/10 bg-background/85 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ height: "67vh", maxHeight: "67vh" }}
      >
        {/* Drag handle */}
        <div className="absolute left-1/2 top-2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-foreground/20" />

        <button
          type="button"
          aria-label="إغلاق"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur"
        >
          <X className="h-4 w-4" strokeWidth={2.6} />
        </button>

        {/* Parallax hero */}
        <div className="relative h-52 w-full overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-apple"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>

        {/* Body */}
        <div className="relative -mt-6 max-h-[55vh] space-y-4 overflow-y-auto px-5 pb-28 pt-2">
          <div>
            <DynamicBadges product={product} className="mb-2" />
            <h2 className="font-display text-xl font-extrabold leading-tight text-foreground">
              {product.name}
            </h2>
            {product.brand && (
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {product.brand}
              </p>
            )}
          </div>

          {product.description && (
            <p className="text-[13px] leading-relaxed text-foreground/80">
              {product.description}
            </p>
          )}

          {/* Adapter slot */}
          <div className="rounded-2xl bg-card/40 p-3 ring-1 ring-foreground/[0.04]">
            {intel.capability.type === "weight_based" ? (
              <WeightAdapter
                product={product}
                capability={intel.capability}
                onChange={handleAdapterChange}
              />
            ) : intel.capability.type === "mix_and_match" ? (
              <MixBuilderAdapter
                product={product}
                capability={intel.capability}
                onChange={handleAdapterChange}
              />
            ) : (
              <StandardAdapter
                product={product}
                onChange={handleAdapterChange}
              />
            )}
          </div>

          {/* Bulk pricing ladder */}
          {intel.bulkTiers.length > 0 && (
            <div className="rounded-2xl bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
              <p className="mb-1.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                ✨ عروض الجملة
              </p>
              <ul className="space-y-1 text-[11px] text-foreground/80">
                {intel.bulkTiers.map((t) => (
                  <li key={t.min_qty} className="flex justify-between">
                    <span>اشترِ {t.min_qty.toLocaleString("ar-EG")}+</span>
                    <span className="font-extrabold">وفّر {t.discount_pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="absolute inset-x-0 bottom-0 border-t border-foreground/10 bg-background/90 px-5 py-3 backdrop-blur-xl">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">الإجمالي</span>
            <div className="text-end">
              {savings > 0 && (
                <span className="me-2 text-[11px] text-muted-foreground line-through">
                  {fmt(result.total)}
                </span>
              )}
              <span className="font-display text-lg font-extrabold text-foreground">
                {fmt(discounted)}
              </span>
              {savings > 0 && (
                <span className="ms-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                  وفّر {fmt(savings)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={Boolean(result.disabled)}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-soft transition ease-apple active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {result.disabled
              ? (result.disabledReason ?? "اكمل الاختيار")
              : "أضف إلى السلة"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SmartProductSheet = memo(SmartProductSheetImpl);
SmartProductSheet.displayName = "SmartProductSheet";
