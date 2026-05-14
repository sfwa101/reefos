import type { Product } from "@/core/catalog/legacyProduct.types";
import ProductCard from "@/components/ProductCard";
import { Sparkles } from "lucide-react";

export type PersonalizedDealsRailProps = {
  items: Product[];
  title?: string;
};

const PersonalizedDealsRail = ({ items, title = "عروض مصممة لك" }: PersonalizedDealsRailProps) => {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base font-extrabold">{title}</h3>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x">
        {items.map((p) => (
          <div key={p.id} className="w-[44%] shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default PersonalizedDealsRail;
