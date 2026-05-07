// SupermarketProductCard
// ----------------------------------------------------------------------
// Wholesale-aware wrapper around the shared `<ProductCard />`. Adds the
// Phase 3 gesture layer:
//   • Minimal visual variant (image + title + price + add).
//   • Tap → opens `ProductPeekSheet` (vaul snap-points 80%/100%) instead of
//     navigating to the legacy product route.
//   • Long-press → opens a Radix `Popover` "Quick Peek" with fast actions
//     (favourite, compare, full details) — vibrates 15ms on activation.

import { memo, useCallback, useMemo, useState } from "react";

import ProductCard from "@/components/ProductCard";
import ProductPeekSheet from "@/apps/reef-al-madina/features/product-detail/components/ProductPeekSheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLongPress } from "@/hooks/useLongPress";
import type { Product } from "@/lib/products";
import { useLivePrice } from "@/core/engine/pricing/hooks/useLivePrice";
import type { WholesaleSelection } from "@/core/engine/pricing/strategies/WholesalePricingStrategy";
import { volumeDealFor } from "@/lib/volumeDeals";
import { Eye, Heart, Scale, Sparkles } from "lucide-react";
import { useIsFavorite, useToggleFavorite } from "@/context/FavoritesContext";

interface SupermarketProductCardProps {
  readonly product: Product;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ar-EG")} ج`;

const SupermarketProductCardImpl = ({ product }: SupermarketProductCardProps) => {
  const [peekOpen, setPeekOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const fav = useIsFavorite(product.id);
  const toggleFav = useToggleFavorite();

  const selection = useMemo<WholesaleSelection>(
    () => ({ quantity: 1, applyVolumeDeals: true }),
    [],
  );
  const { supported, breakdown } = useLivePrice<WholesaleSelection>(product, selection);

  const staticDeal = volumeDealFor(product);
  const volumeBadge = staticDeal
    ? { buy: staticDeal.buy, save: staticDeal.save }
    : undefined;

  const wholesaleHint =
    supported && breakdown && breakdown.discountTotal > 0
      ? breakdown.discountTotal
      : 0;

  const openPeek = useCallback(() => setPeekOpen(true), []);
  const longPress = useLongPress(() => setPopOpen(true), { delay: 400 });

  return (
    <Popover open={popOpen} onOpenChange={setPopOpen}>
      <PopoverTrigger asChild>
        <div {...longPress} className="relative">
          <ProductCard
            product={product}
            variant="minimal"
            volumeBadge={volumeBadge}
            onOpen={openPeek}
          />
          {wholesaleHint > 0 && (
            <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-pill">
              <Sparkles className="h-3 w-3" strokeWidth={2.6} />
              وفّر {fmt(wholesaleHint)}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-56 p-2"
      >
        <div className="flex flex-col gap-1 text-right">
          <p className="line-clamp-1 px-2 pb-1 text-[12px] font-bold text-foreground">
            {product.name}
          </p>
          <button
            type="button"
            onClick={() => {
              setPopOpen(false);
              openPeek();
            }}
            className="flex items-center justify-end gap-2 rounded-lg px-2 py-2 text-[13px] font-medium hover:bg-accent/40 active:scale-[0.99]"
          >
            <span>التفاصيل الكاملة</span>
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              void toggleFav(product.id);
              setPopOpen(false);
            }}
            className="flex items-center justify-end gap-2 rounded-lg px-2 py-2 text-[13px] font-medium hover:bg-accent/40 active:scale-[0.99]"
          >
            <span>{fav ? "إزالة من المفضلة" : "أضف للمفضلة"}</span>
            <Heart className={`h-4 w-4 ${fav ? "fill-destructive text-destructive" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setPopOpen(false)}
            className="flex items-center justify-end gap-2 rounded-lg px-2 py-2 text-[13px] font-medium hover:bg-accent/40 active:scale-[0.99]"
          >
            <span>قارن</span>
            <Scale className="h-4 w-4" />
          </button>
        </div>
      </PopoverContent>

      <ProductPeekSheet
        productId={peekOpen ? product.id : null}
        isOpen={peekOpen}
        onClose={() => setPeekOpen(false)}
      />
    </Popover>
  );
};

export const SupermarketProductCard = memo(SupermarketProductCardImpl);
SupermarketProductCard.displayName = "SupermarketProductCard";
