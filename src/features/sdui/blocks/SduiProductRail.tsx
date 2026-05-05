/**
 * SduiProductRail — Trillion-Dollar Apple-Glass product rail.
 *
 * Card behaviour:
 *   • Square uniform image (aspect-square) on a soft muted plate.
 *   • Inline +/- stepper for STANDARD products (no variants, no weight, no mix).
 *   • Tap card → opens SmartProductSheet for variant / weight / mix products.
 *   • Bulk-pricing badge (e.g. "خصم 15% عند 3+") surfaced from metadata.
 */
import { memo, useMemo } from "react";
import { Plus, Minus } from "lucide-react";
import { useProductsBySourceQuery } from "@/hooks/useProductsQuery";
import { useProductSheet } from "@/features/products/ProductSheetContext";
import { DynamicBadges } from "@/features/products/components/DynamicBadges";
import { useCartActions, useCartLineQty } from "@/context/CartContext";
import { readProductIntelligence } from "@/features/products/types/capabilities";
import type { Product, ProductSource } from "@/lib/products";
import type { SduiProductRailBlock as Props } from "../engine/schemas";

const fmt = (n: number) => `${Math.round(n).toLocaleString("ar-EG")} ج`;

/* ───────── inline card (memoized so qty updates only redraw 1 card) ───────── */

interface CardProps {
  readonly product: Product;
}

const ProductCardImpl = ({ product }: CardProps) => {
  const { open } = useProductSheet();
  const { add, setQty } = useCartActions();
  const qty = useCartLineQty(product.id);
  const intel = useMemo(() => readProductIntelligence(product.metadata), [product.metadata]);

  const isStandard =
    intel.capability.type === "standard" &&
    (!product.variants || product.variants.length === 0);

  const bulk = intel.bulkTiers[0];

  const onPick = () => {
    if (isStandard) {
      add(product, 1);
    } else {
      open(product);
    }
  };

  return (
    <div className="snap-start shrink-0 w-[150px] rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl ring-1 ring-foreground/[0.04] overflow-hidden transition ease-apple hover:bg-card/60">
      <button
        type="button"
        onClick={() => open(product)}
        className="block w-full text-start"
        aria-label={product.name}
      >
        <div className="relative aspect-square w-full bg-muted/40">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute right-1.5 top-1.5">
            <DynamicBadges product={product} />
          </div>
          {bulk && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-950 shadow">
              -{bulk.discount_pct}% × {bulk.min_qty}+
            </span>
          )}
        </div>
        <div className="space-y-1 px-2.5 pt-2">
          <p className="line-clamp-2 min-h-[32px] text-[12px] font-extrabold leading-tight text-foreground">
            {product.name}
          </p>
          <p className="text-[12px] font-extrabold text-primary tabular-nums">
            {fmt(product.price)}
            <span className="ms-1 text-[10px] font-medium text-muted-foreground">
              / {product.unit}
            </span>
          </p>
        </div>
      </button>

      {/* Smart CTA: stepper for standards, "اختر" for the rest */}
      <div className="px-2.5 pb-2.5 pt-1.5">
        {isStandard && qty > 0 ? (
          <div className="flex items-center justify-between rounded-full bg-primary/10 px-1 py-1">
            <button
              type="button"
              onClick={() => setQty(product.id, qty - 1)}
              className="grid h-7 w-7 place-items-center rounded-full bg-background text-foreground shadow-soft active:scale-95"
              aria-label="إنقاص"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
            </button>
            <span className="font-display text-sm font-extrabold tabular-nums text-foreground">
              {qty.toLocaleString("ar-EG")}
            </span>
            <button
              type="button"
              onClick={() => setQty(product.id, qty + 1)}
              className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft active:scale-95"
              aria-label="إضافة"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPick}
            className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-1.5 text-[12px] font-extrabold text-primary-foreground shadow-soft transition ease-apple active:scale-[0.97]"
          >
            {isStandard ? (
              <>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                إضافة
              </>
            ) : (
              "اختر"
            )}
          </button>
        )}
      </div>
    </div>
  );
};
const ProductCard = memo(ProductCardImpl);
ProductCard.displayName = "SduiProductRailCard";

/* ───────── rail container ───────── */

const SduiProductRailImpl = ({ block }: { block: Props }) => {
  const { source, sub_category, keywords, limit, title } = block.props;
  const { data: pool = [], isLoading } = useProductsBySourceQuery(source as ProductSource);

  const items = useMemo<Product[]>(() => {
    let list = pool;
    if (sub_category) {
      list = list.filter((p) => p.subCategory === sub_category);
    } else if (keywords && keywords.length > 0) {
      list = list.filter((p) =>
        keywords.some(
          (kw) => p.name.includes(kw) || (p.subCategory ?? "").includes(kw),
        ),
      );
    }
    return list.slice(0, limit);
  }, [pool, sub_category, keywords, limit]);

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="px-3">
      {title && (
        <h3 className="mb-2 px-1 font-display text-sm font-extrabold tracking-tight text-foreground/90">
          {title}
        </h3>
      )}
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[150px] h-[230px] rounded-2xl bg-card/40 animate-pulse"
              />
            ))
          : items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

export const SduiProductRail = memo(SduiProductRailImpl);
SduiProductRail.displayName = "SduiProductRail";
