// ProductGrid — renders all groups → subs → product cards as a flat feed.
// Pure presentational. Hosts the section refs (registered via callback).

import { memo } from "react";
import type { SupermarketGroup } from "../types";
import { SUPERMARKET_NAV } from "../types";
import { SupermarketProductCard } from "./SupermarketProductCard";

interface ProductGridProps {
  readonly grouped: ReadonlyArray<SupermarketGroup>;
  readonly registerSectionRef: (id: string) => (el: HTMLElement | null) => void;
}

const ProductGridImpl = ({ grouped, registerSectionRef }: ProductGridProps) => {
  if (grouped.length === 0) {
    return (
      <p className="rounded-2xl bg-foreground/5 p-6 text-center text-xs text-muted-foreground">
        لا توجد نتائج للبحث
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map((g) => (
        <div key={g.group.id} className="space-y-5">
          {/* Group header tile */}
          <div
            className="rounded-2xl px-4 py-3 shadow-soft"
            style={{
              background: `linear-gradient(135deg, hsl(${g.group.color.tint}), hsl(${g.group.color.tint} / 0.6))`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {g.group.emoji}
              </span>
              <h2
                className="font-display text-lg font-extrabold"
                style={{ color: `hsl(${g.group.color.hue})` }}
              >
                {g.group.name}
              </h2>
            </div>
          </div>

          {g.subs.map(({ sub, items }) => (
            <section
              key={sub.id}
              ref={registerSectionRef(sub.id)}
              style={{ scrollMarginTop: SUPERMARKET_NAV.TOTAL }}
            >
              <h3 className="mb-3 flex items-center gap-2 px-1 text-base font-extrabold text-foreground">
                <span
                  className="inline-block h-3 w-1 rounded-full"
                  style={{ background: `hsl(${g.group.color.hue})` }}
                />
                {sub.name}
                <span className="text-[10px] font-medium text-muted-foreground">
                  · {items.length}
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {items.map((p) => (
                  <SupermarketProductCard
                    key={`${sub.id}-${p.id}`}
                    product={p}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
      <div style={{ height: "60vh" }} />
    </div>
  );
};

export const ProductGrid = memo(ProductGridImpl);
ProductGrid.displayName = "ProductGrid";
