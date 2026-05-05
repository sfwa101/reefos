/**
 * SduiProductGrid — Vertical responsive product grid (no carousels).
 *
 * Card behaviour mirrors the rail card (Apple Glass, smart +/− stepper,
 * tap to open SmartProductSheet) but rendered as a clean 2- or 3-column
 * grid for the trillion-dollar continuous vertical feed.
 */
import { memo, useMemo } from "react";
import { Plus, Minus } from "lucide-react";
import { useProductsBySourceQuery } from "@/hooks/useProductsQuery";
import { useProductSheet } from "@/features/products/ProductSheetContext";
import { DynamicBadges } from "@/features/products/components/DynamicBadges";
import { useCartActions, useCartLineQty } from "@/context/CartContext";
import { readProductIntelligence } from "@/features/products/types/capabilities";
import type { Product, ProductSource } from "@/lib/products";
import type { SduiProductGridBlock as Props } from "../engine/schemas";

const fmt = (n: number) => `${Math.round(n).toLocaleString("ar-EG")} ج`;

const GridCardImpl = ({ product }: { product: Product }) => {
  const { open } = useProductSheet();
  const { add, setQty } = useCartActions();
  const qty = useCartLineQty(product.id);
  const intel = useMemo(() => readProductIntelligence(product.metadata), [product.metadata]);

  const isStandard =
    intel.capability.type === "standard" &&
    (!product.variants || product.variants.length === 0);

  const bulk = intel.bulkTiers[0];

  const onPlus = () => {
    if (isStandard) add(product, 1);
    else open(product);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/50 backdrop-blur-xl ring-1 ring-foreground/[0.04] shadow-soft transition ease-apple">
      <button
        type="button"
        onClick={() => open(product)}
        className="block w-full text-start"
        aria-label={product.name}
      >
        <div className="relative aspect-square w-full bg-muted/30">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-apple group-hover:scale-[1.03]"
          />
          <div className="absolute right-2 top-2">
            <DynamicBadges product={product} />
          </div>
          {bulk && (
            <span className="absolute left-2 top-2 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow">
              -{bulk.discount_pct}% × {bulk.min_qty}+
            </span>
          )}
          {/* Floating + button — bottom-right of image */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onPlus();
            }}
            aria-label="إضافة سريعة"
            className="absolute bottom-2 left-2 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-elegant ring-2 ring-background transition ease-apple active:scale-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2.8} />
          </button>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => open(product)}
          className="text-start"
        >
          <p className="line-clamp-2 min-h-[34px] text-[12.5px] font-extrabold leading-tight text-foreground">
            {product.name}
          </p>
        </button>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            {product.oldPrice && product.oldPrice > product.price && (
              <p className="text-[10px] text-muted-foreground line-through tabular-nums">
                {fmt(product.oldPrice)}
              </p>
            )}
            <p className="font-display text-[14px] font-extrabold text-primary tabular-nums leading-none">
              {fmt(product.price)}
              <span className="ms-1 text-[10px] font-medium text-muted-foreground">
                / {product.unit}
              </span>
            </p>
          </div>

          {isStandard && qty > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-1 py-0.5">
              <button
                type="button"
                onClick={() => setQty(product.id, qty - 1)}
                className="grid h-6 w-6 place-items-center rounded-full bg-background text-foreground shadow-soft active:scale-95"
                aria-label="إنقاص"
              >
                <Minus className="h-3 w-3" strokeWidth={2.6} />
              </button>
              <span className="min-w-[14px] text-center font-display text-[12px] font-extrabold tabular-nums text-foreground">
                {qty.toLocaleString("ar-EG")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
const GridCard = memo(GridCardImpl);
GridCard.displayName = "SduiProductGridCard";

const SduiProductGridImpl = ({ block }: { block: Props }) => {
  const { source, sub_category, keywords, limit, columns, title, anchor } = block.props;
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

  const colCls = columns === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <section id={anchor} className="px-3 scroll-mt-[220px]">
      {title && (
        <h3 className="mb-2 px-1 font-display text-sm font-extrabold tracking-tight text-foreground/90">
          {title}
        </h3>
      )}
      <div className={`grid gap-3 ${colCls}`}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[260px] rounded-3xl bg-card/40 animate-pulse" />
            ))
          : items.map((p) => <GridCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

export const SduiProductGrid = memo(SduiProductGridImpl);
SduiProductGrid.displayName = "SduiProductGrid";
