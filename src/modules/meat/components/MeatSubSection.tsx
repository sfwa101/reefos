import { memo } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

interface Props {
  readonly subId: string;
  readonly label: string;
  readonly items: ReadonlyArray<Product>;
}

/**
 * MeatSubSection — renders a single sub-category band (title + grid).
 * Wrapped in memo so unrelated chip clicks don't re-render every grid.
 */
const MeatSubSectionComponent = ({ subId, label, items }: Props) => (
  <>
    <h3 className="mb-3 px-1 font-display text-base font-extrabold text-foreground/90">
      {label}{" "}
      <span className="text-xs text-muted-foreground">· {items.length}</span>
    </h3>
    {items.length === 0 ? (
      <p className="rounded-2xl bg-foreground/5 p-6 text-center text-xs text-muted-foreground">
        لا توجد منتجات في هذا القسم بعد
      </p>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => (
          <ProductCard key={`${subId}-${p.id}`} product={p} />
        ))}
      </div>
    )}
  </>
);

export const MeatSubSection = memo(MeatSubSectionComponent);
