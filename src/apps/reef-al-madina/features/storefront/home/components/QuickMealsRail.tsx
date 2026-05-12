/**
 * QuickMealsRail — minimalist rail surfacing ready-to-eat / kitchen items
 * from the live catalog. SDUI section, zero hardcoded products.
 *
 * Strategy: prefer items whose category mentions kitchen/meals/restaurant;
 * fall back to a slice of bestsellers so the rail never goes blank when
 * the catalog hasn't been tagged yet.
 */
import { useMemo } from "react";
import { Soup } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/core/catalog/legacy/legacyProduct.types";

const KEYWORDS = ["مطبخ", "وجب", "أكل", "طعام", "جاهز", "kitchen", "meal", "ready", "restaurant", "food"];

const QuickMealsRail = ({
  catalog = [],
  title = "وجبات سريعة",
}: {
  catalog?: Product[];
  title?: string;
}) => {
  const items = useMemo(() => {
    if (!catalog.length) return [];
    const matchKw = (s?: string | null) => {
      if (!s) return false;
      const v = s.toLowerCase();
      return KEYWORDS.some((k) => v.includes(k));
    };
    const tagged = catalog.filter((p) => {
      const anyP = p as unknown as {
        category?: string | null;
        sub_category?: string | null;
        tags?: string[] | null;
      };
      return (
        matchKw(anyP.category) ||
        matchKw(anyP.sub_category) ||
        (Array.isArray(anyP.tags) && anyP.tags.some((t) => matchKw(t)))
      );
    });
    const pick = tagged.length >= 4 ? tagged : catalog;
    return pick.slice(0, 12);
  }, [catalog]);

  if (items.length === 0) return null;

  return (
    <section dir="rtl">
      <div className="mb-3 flex items-center gap-2 px-1">
        <Soup className="h-4 w-4 text-foreground/60" />
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

export default QuickMealsRail;
