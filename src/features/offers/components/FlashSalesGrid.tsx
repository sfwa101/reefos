import type { Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { Flame } from "lucide-react";

export type FlashSalesGridProps = {
  items: Product[];
  title?: string;
};

const FlashSalesGrid = ({ items, title = "عروض الفلاش" }: FlashSalesGridProps) => {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Flame className="h-4 w-4 text-rose-500" />
        <h3 className="font-display text-base font-extrabold">{title}</h3>
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
