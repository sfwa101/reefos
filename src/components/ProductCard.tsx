import { Plus, Minus, Heart } from "lucide-react";
import { useCartActions, useCartLineQty } from "@/core/orders/runtime/react/CartProvider";
import { isPerishable, type Product } from "@/core/catalog/legacyProduct.types";
import { Link } from "@tanstack/react-router";
import { memo, useEffect, useRef, useState } from "react";
import { useIsFavorite, useToggleFavorite } from "@/context/FavoritesContext";
import { toLatin } from "@/lib/format";
import { useLocationStatic as useLocation } from "@/context/LocationContext";
import {
  fulfillmentMeta,
  fulfillmentTypeFor,
  isSweetsProduct,
} from "@/core/commerce/variants/custom-fulfillment-rules";
import SweetsProductSheet from "@/apps/reef-al-madina/runtime-blocks/product/sweets-sheet";
import ButcherSheet from "@/apps/reef-al-madina/runtime-blocks/product/butcher-sheet";
import { isButcheryProduct } from "@/core/commerce/variants/weighed-prep-rules";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  product: Product;
  variant?: "grid" | "carousel" | "wide" | "minimal";
  /** Optional bulk-discount hint rendered as an overlay chip on the image. */
  volumeBadge?: { buy: number; save: number };
  /** When provided, the entire card surface (image + title) calls this
   *  instead of navigating via <Link>. Used by gesture surfaces (e.g. the
   *  Supermarket Quick-Peek grid) that open a `ProductPeekSheet`. */
  onOpen?: () => void;
}

const badgeStyle: Record<string, { label: string; cls: string }> = {
  best: { label: "الأكثر مبيعًا", cls: "bg-accent/95 text-accent-foreground" },
  trending: { label: "رائج", cls: "bg-primary text-primary-foreground" },
  premium: { label: "مميّز", cls: "bg-foreground text-background" },
  new: { label: "جديد", cls: "bg-primary-soft text-primary" },
};

const ProductCardImpl = ({ product, variant = "grid", volumeBadge, onOpen }: ProductCardProps) => {
  // Granular subscriptions — only this card re-renders when its qty/fav flips.
  const { add, setQty } = useCartActions();
  const qty = useCartLineQty(product.id);
  const fav = useIsFavorite(product.id);
  const toggleFav = useToggleFavorite();
  const { zone } = useLocation();
  const badge = product.badge ? badgeStyle[product.badge] : null;

  const unavailable = !zone.acceptsPerishables && isPerishable(product);

  const sweets = isSweetsProduct(product.source);
  const fType = sweets
    ? fulfillmentTypeFor(product.id, product.subCategory)
    : null;
  const fMeta = fType ? fulfillmentMeta[fType] : null;
  const meat = isButcheryProduct(product.source);
  const opensSheet = sweets || meat;
  const [sheetOpen, setSheetOpen] = useState(false);

  const [pulse, setPulse] = useState(0);
  const lastQtyRef = useRef(qty);
  useEffect(() => {
    if (qty > lastQtyRef.current) setPulse((p) => p + 1);
    lastQtyRef.current = qty;
  }, [qty]);

  const widthCls = variant === "carousel" ? "w-[160px] shrink-0" : "w-full";

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(10); } catch { /* ignore */ }
    }
    if (opensSheet) {
      setSheetOpen(true);
      return;
    }
    add(product);
  };
  const handleInc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (opensSheet) {
      setSheetOpen(true);
      return;
    }
    add(product);
  };
  const handleDec = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(product.id, Math.max(0, qty - 1));
  };
  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleFav(product.id);
  };

  // NOTE: switched from `glass-strong` (heavy backdrop-filter on every card —
  // a major scrolling bottleneck on low-end devices) to a flat surface card.
  // `content-visibility: auto` lets the browser skip painting offscreen cards.
  if (variant === "minimal") {
    const handleSurface = (e: React.MouseEvent) => {
      if (!onOpen) return;
      e.preventDefault();
      e.stopPropagation();
      onOpen();
    };
    return (
      <article
        onClick={handleSurface}
        className={`product-card group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-right shadow-soft ring-1 ring-border/50 transition active:scale-[0.98] ${widthCls}`}
        style={{ contentVisibility: "auto", containIntrinsicSize: "200px 260px" }}
      >
        <div className="relative aspect-square overflow-hidden bg-secondary/40">
          <OptimizedImage
            src={product.image}
            alt={product.name}
            aspect="aspect-square"
            wrapperClassName="absolute inset-0"
            className="h-full w-full object-cover object-center"
          />
          {volumeBadge && (
            <span
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold text-primary-foreground shadow-pill tabular-nums"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)" }}
            >
              ×{toLatin(volumeBadge.buy)} · وفّر {toLatin(volumeBadge.save)}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-1 text-[13px] font-bold leading-tight text-foreground">
            {product.name}
          </h3>
          <div className="mt-auto flex items-end justify-between">
            <span className="font-display text-lg font-extrabold tabular-nums">
              {toLatin(Number(product?.price) || 0)}
              <span className="text-[10px] font-medium text-muted-foreground"> ج.م</span>
            </span>
            {qty === 0 ? (
              <Button
                onClick={handleAdd}
                aria-label="أضف إلى السلة"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pill transition active:scale-90"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </Button>
            ) : (
              <div className="flex h-9 items-center gap-1 rounded-full bg-primary text-primary-foreground shadow-pill">
                <Button onClick={handleDec} aria-label="إنقاص" className="flex h-9 w-8 items-center justify-center rounded-full active:scale-90">
                  <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                </Button>
                <span className="min-w-[1ch] text-center text-sm font-extrabold tabular-nums">{toLatin(qty)}</span>
                <Button onClick={handleInc} aria-label="زيادة" className="flex h-9 w-8 items-center justify-center rounded-full active:scale-90">
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`product-card group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/50 ${widthCls} ${unavailable ? "opacity-95" : ""}`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "320px 260px" }}
    >
      {unavailable && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/70">
          <span className="rounded-full bg-foreground/85 px-3 py-1.5 text-[10px] font-extrabold text-background shadow-pill">
            قريبًا في منطقتك
          </span>
        </div>
      )}
      {opensSheet ? (
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSheetOpen(true);
          }}
          className="relative block aspect-square w-full overflow-hidden rounded-t-2xl bg-secondary/40 text-right"
          aria-label={product.name}
        >
        <OptimizedImage
          src={product.image}
          alt={product.name}
          aspect="aspect-square"
          wrapperClassName="absolute inset-0 rounded-t-2xl"
          className="h-full w-full object-cover object-center"
        />
        {badge && (
          <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
            {badge.label}
          </span>
        )}
        {fMeta && (
          <span
            className={`absolute ${badge ? "right-2 top-8" : "right-2 top-2"} inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold shadow-pill ${fMeta.badgeBg} ${fMeta.badgeText}`}
          >
            <span className="text-[10px] leading-none">{fMeta.emoji}</span>
            {fMeta.badge}
          </span>
        )}
        {product.oldPrice && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground tabular-nums">
            خصم {toLatin(Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100))}٪
          </span>
        )}
        {product.oldPrice && product.oldPrice - product.price >= 5 && (
          <span
            className="absolute left-2 top-9 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold text-accent-foreground shadow-pill tabular-nums"
            style={{ background: "linear-gradient(135deg, hsl(var(--accent)), hsl(36 95% 55%))" }}
          >
            وفّر {toLatin(Math.round(product.oldPrice - product.price))} ج.م
          </span>
        )}
        <span
          onClick={handleFav}
          role="button"
          aria-label="مفضلة"
          className={`absolute bottom-2 left-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition ${
            fav ? "bg-destructive/90 text-white" : "bg-background/80 text-foreground"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${fav ? "fill-white" : ""}`} strokeWidth={2.4} />
        </span>
        {volumeBadge && (
          <span
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-extrabold text-primary-foreground shadow-pill tabular-nums ring-1 ring-white/30"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)",
            }}
          >
            <span aria-hidden className="text-[11px] leading-none">📦</span>
            <span>×{toLatin(volumeBadge.buy)}</span>
            <span className="opacity-80">·</span>
            <span>وفّر {toLatin(volumeBadge.save)}</span>
          </span>
        )}
        </Button>
      ) : (
        <Link
          to="/product/$productId"
          params={{ productId: product.id }}
          className="relative block aspect-square w-full overflow-hidden rounded-t-2xl bg-secondary/40"
        >
          <OptimizedImage
            src={product.image}
            alt={product.name}
            aspect="aspect-square"
            wrapperClassName="absolute inset-0 rounded-t-2xl"
            className="h-full w-full object-cover object-center"
          />
          {badge && (
            <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          {fMeta && (
            <span
              className={`absolute ${badge ? "right-2 top-8" : "right-2 top-2"} inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold shadow-pill ${fMeta.badgeBg} ${fMeta.badgeText}`}
            >
              <span className="text-[10px] leading-none">{fMeta.emoji}</span>
              {fMeta.badge}
            </span>
          )}
          {product.oldPrice && (
            <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground tabular-nums">
              خصم {toLatin(Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100))}٪
            </span>
          )}
        {product.oldPrice && product.oldPrice - product.price >= 5 && (
          <span
            className="absolute left-2 top-9 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold text-accent-foreground shadow-pill tabular-nums"
            style={{ background: "linear-gradient(135deg, hsl(var(--accent)), hsl(36 95% 55%))" }}
          >
            وفّر {toLatin(Math.round(product.oldPrice - product.price))} ج.م
          </span>
        )}
          <Button
            onClick={handleFav}
            aria-label="مفضلة"
            className={`absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full transition ${
              fav ? "bg-destructive/90 text-white" : "bg-background/80 text-foreground"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${fav ? "fill-white" : ""}`} strokeWidth={2.4} />
          </Button>
          {volumeBadge && (
            <span
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-extrabold text-primary-foreground shadow-pill tabular-nums ring-1 ring-white/30"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)",
              }}
            >
              <span aria-hidden className="text-[11px] leading-none">📦</span>
              <span>×{toLatin(volumeBadge.buy)}</span>
              <span className="opacity-80">·</span>
              <span>وفّر {toLatin(volumeBadge.save)}</span>
            </span>
          )}
        </Link>
      )}

      <div className="flex flex-1 flex-col gap-1 p-3">
        {opensSheet ? (
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSheetOpen(true);
            }}
            className="block text-right"
          >
            <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-foreground">
              {product.name}
            </h3>
          </Button>
        ) : (
          <Link to="/product/$productId" params={{ productId: product.id }} className="block">
            <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-foreground">
              {product.name}
            </h3>
          </Link>
        )}
        {product.brand && (
          <Link
            to="/search"
            search={{ q: product.brand, brand: product.brand }}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 inline-block w-fit rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-extrabold text-primary ring-1 ring-primary/15 transition active:scale-95"
            aria-label={`تصفية حسب ${product.brand}`}
          >
            {product.brand}
          </Link>
        )}
        <p className="text-[10px] text-muted-foreground">{product.unit}</p>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="leading-none">
            <span className="font-display text-lg font-extrabold text-foreground tabular-nums">{toLatin(Number(product?.price) || 0)}</span>
            <span className="text-[10px] font-medium text-muted-foreground"> ج.م</span>
            {product.oldPrice ? (
              <div className="text-[10px] text-muted-foreground line-through tabular-nums">{toLatin(Number(product.oldPrice) || 0)} ج.م</div>
            ) : null}
          </div>

          <div className="relative">
            {pulse > 0 && (
              <span
                key={pulse}
                aria-hidden
                className="animate-plus-one pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-pill"
              >
                +1
              </span>
            )}

            {qty === 0 ? (
              <Button
                onClick={handleAdd}
                aria-label="أضف إلى السلة"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pill transition active:scale-90"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </Button>
            ) : (
              <div className="flex h-9 items-center gap-1 rounded-full bg-primary text-primary-foreground shadow-pill">
                <Button
                  onClick={handleDec}
                  aria-label="إنقاص"
                  className="flex h-9 w-8 items-center justify-center rounded-full transition active:scale-90"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                </Button>
                <span className="min-w-[1ch] text-center text-sm font-extrabold tabular-nums">
                  {toLatin(qty)}
                </span>
                <Button
                  onClick={handleInc}
                  aria-label="زيادة"
                  className="flex h-9 w-8 items-center justify-center rounded-full transition active:scale-90"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {opensSheet && sweets && (
        <SweetsProductSheet
          product={product}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      )}
      {opensSheet && meat && (
        <ButcherSheet
          product={product}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </article>
  );
};

// Memoize so the parent (e.g. ProductCarousel/SinglePageStore) doesn't force
// every card to re-render when an unrelated sibling state changes. Equality is
// shallow on product reference + variant + volumeBadge fields.
const ProductCard = memo(ProductCardImpl, (prev, next) => {
  if (prev.product !== next.product) return false;
  if (prev.variant !== next.variant) return false;
  const a = prev.volumeBadge;
  const b = next.volumeBadge;
  if (a === b) return true;
  if (!a || !b) return false;
  return a.buy === b.buy && a.save === b.save;
});

export default ProductCard;
