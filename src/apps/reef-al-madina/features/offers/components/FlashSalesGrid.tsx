import type { Product } from "@/core/catalog/legacy/legacyProduct.types";
import ProductCard from "@/components/ProductCard";
import { Flame } from "lucide-react";

export type FlashSalesGridProps = {
  items: Product[];
  title?: string;
  subtitle?: string;
  /** When true, the rail dims and timers/animations should be paused (Spirit Engine). */
  paused?: boolean;
};

const FlashSalesGrid = ({ items, title = "عروض الفلاش", subtitle, paused = false }: FlashSalesGridProps) => {
  if (items.length === 0) return null;
  return (
    <section className={paused ? "opacity-50 saturate-50 transition" : "transition"} aria-disabled={paused}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Flame className="h-4 w-4 text-rose-500" />
        <div className="flex-1">
          <h3 className="font-display text-base font-extrabold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};

export default FlashSalesGrid;
