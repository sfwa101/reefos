import { useMemo } from "react";
import { products, useProductsVersion } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { Tag } from "lucide-react";

export type SectionOffersRailProps = {
  title: string;
  subtitle?: string | null;
  targetId: string | null;
};

const SectionOffersRail = ({ title, subtitle, targetId }: SectionOffersRailProps) => {
  const _pv = useProductsVersion();
  const items = useMemo(() => {
    const pool = products.filter((p) => p.oldPrice);
    if (!targetId) return pool.slice(0, 8);
    return pool.filter((p) => p.category === targetId || p.id === targetId).slice(0, 8);
  }, [_pv, targetId]);

  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Tag className="h-4 w-4 text-primary" />
        <div>
          <h3 className="font-display text-base font-extrabold leading-tight">{title}</h3>
          {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 no-scrollbar snap-x">
        {items.map((p) => (
          <div key={p.id} className="w-[160px] shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default SectionOffersRail;
