// SupermarketProductCard
// ----------------------------------------------------------------------
// Wholesale-aware wrapper around the shared `<ProductCard />`.
//
// Why a wrapper instead of mutating ProductCard:
//   • Keeps the legacy ProductCard untouched (used by ~30 other surfaces).
//   • Lets the supermarket vertical opt into the central PricingEngine
//     via `useLivePrice` with a `WholesaleSelection` payload.
//   • Renders an inline "سعر الجملة" badge the moment the user crosses
//     a tier threshold (≥6 by default, or whatever the catalog defines).
//
// Failure mode: if the engine is unsupported / errors, we silently fall
// back to the static `volumeBadge` UI — graceful degradation.

import { memo, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import { useLivePrice } from "@/core/engine/pricing/hooks/useLivePrice";
import type { WholesaleSelection } from "@/core/engine/pricing/strategies/WholesalePricingStrategy";
import { volumeDealFor } from "@/lib/volumeDeals";
import { Minus, Plus, Sparkles } from "lucide-react";

interface SupermarketProductCardProps {
  readonly product: Product;
}

const fmt = (n: number) =>
  `${Math.round(n).toLocaleString("ar-EG")} ج`;

const SupermarketProductCardImpl = ({ product }: SupermarketProductCardProps) => {
  // Local quantity for the live wholesale preview. Cart additions still
  // happen through the existing ProductCard "+" affordance with qty=1
  // — this control is purely a discovery tool for the bulk discount.
  const [previewQty, setPreviewQty] = useState<number>(1);

  // Selection is referentially memoised — useLivePrice keys on identity.
  const selection = useMemo<WholesaleSelection>(
    () => ({
      quantity: previewQty,
      applyVolumeDeals: true,
    }),
    [previewQty],
  );

  const { supported, breakdown } = useLivePrice<WholesaleSelection>(
    product,
    selection,
  );

  // Static deal (legacy badge) — always passed to the underlying card so
  // the visual treatment matches the rest of the storefront.
  const staticDeal = volumeDealFor(product);
  const volumeBadge = staticDeal
    ? { buy: staticDeal.buy, save: staticDeal.save }
    : undefined;

  // Engine-driven savings: only show the live block when the user has
  // actually engaged the stepper and crossed a threshold.
  const engineDiscount =
    supported && breakdown && previewQty > 1 && breakdown.discountTotal > 0
      ? breakdown.discountTotal
      : 0;
  const showLiveBlock = engineDiscount > 0;

  const dec = () => setPreviewQty((q) => Math.max(1, q - 1));
  const inc = () => setPreviewQty((q) => Math.min(99, q + 1));

  return (
    <div className="relative">
      <ProductCard product={product} volumeBadge={volumeBadge} />

      {/* Wholesale stepper — appears only when the SKU has any deal path */}
      {(staticDeal || supported) && (
        <div className="mt-1.5 flex items-center justify-between rounded-xl bg-foreground/5 px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="نقص الكمية"
              onClick={dec}
              className="grid h-6 w-6 place-items-center rounded-full bg-background/80 text-foreground/70 active:scale-95"
            >
              <Minus className="h-3 w-3" strokeWidth={2.6} />
            </button>
            <span className="min-w-[1.5rem] text-center text-[11px] font-extrabold tabular-nums">
              {previewQty.toLocaleString("ar-EG")}
            </span>
            <button
              type="button"
              aria-label="زيادة الكمية"
              onClick={inc}
              className="grid h-6 w-6 place-items-center rounded-full bg-background/80 text-foreground/70 active:scale-95"
            >
              <Plus className="h-3 w-3" strokeWidth={2.6} />
            </button>
          </div>

          {showLiveBlock && breakdown ? (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" strokeWidth={2.6} />
              <span>سعر الجملة · وفّر {fmt(engineDiscount)}</span>
            </div>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">
              جرّب الكمية للجملة
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// React.memo — supermarket grids render hundreds of cards; shallow product
// reference equality is the right key (catalog mutations swap the ref).
export const SupermarketProductCard = memo(SupermarketProductCardImpl);
SupermarketProductCard.displayName = "SupermarketProductCard";
