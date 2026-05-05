/**
 * SduiProductRail — data-driven horizontal product rail for SDUI layouts.
 * Filters the live catalog by `source` + `sub_category` (or keyword
 * fallback). Tapping a card opens SmartProductSheet via the provider.
 */
import { memo, useMemo } from "react";
import { useProductsBySourceQuery } from "@/hooks/useProductsQuery";
import { useProductSheet } from "@/features/products/ProductSheetContext";
import { DynamicBadges } from "@/features/products/components/DynamicBadges";
import type { Product, ProductSource } from "@/lib/products";
import type { SduiProductRailBlock as Props } from "../engine/schemas";

const fmt = (n: number) => `${Math.round(n).toLocaleString("ar-EG")} ج`;

const SduiProductRailImpl = ({ block }: { block: Props }) => {
  const { source, sub_category, keywords, limit, title } = block.props;
  const { data: pool = [], isLoading } = useProductsBySourceQuery(source as ProductSource);
  const { open } = useProductSheet();

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
                className="snap-start shrink-0 w-36 h-48 rounded-2xl bg-card/40 animate-pulse"
              />
            ))
          : items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => open(p)}
                className="snap-start shrink-0 w-36 overflow-hidden rounded-2xl border border-border/40 bg-card/60 text-start backdrop-blur-xl ring-1 ring-foreground/[0.04] transition ease-apple hover:bg-card/80 active:scale-[0.97]"
              >
                <div className="relative h-28 w-full overflow-hidden bg-foreground/5">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute right-1.5 top-1.5">
                    <DynamicBadges product={p} />
                  </div>
                </div>
                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-2 text-[12px] font-extrabold leading-tight text-foreground">
                    {p.name}
                  </p>
                  <p className="text-[11px] font-bold text-primary">
                    {fmt(p.price)}
                    <span className="ms-1 text-[10px] font-medium text-muted-foreground">
                      / {p.unit}
                    </span>
                  </p>
                </div>
              </button>
            ))}
      </div>
    </section>
  );
};

export const SduiProductRail = memo(SduiProductRailImpl);
SduiProductRail.displayName = "SduiProductRail";
