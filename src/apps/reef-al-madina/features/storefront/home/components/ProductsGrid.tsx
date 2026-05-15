/**
 * ProductsGrid — main 2-column product grid + empty-state with reset CTA.
 */
import { Layers3 } from "lucide-react";

import { toLatin } from "@/lib/format";

import type { ProductCardVM } from "@/core/catalog/types";

import { CATS } from "../dictionaries";
import { ProductCard } from "./ProductCard";
import { RailHeader } from "./RailHeader";
import { Button } from "@/components/ui/button";

export const ProductsGrid = ({
  cat,
  filtered,
  hue,
  onOpen,
  onResetAll,
  catalogTotal,
  isLoading,
  dynamicCats,
}: {
  cat: string;
  filtered: ProductCardVM[];
  hue: string;
  onOpen: (id: string) => void;
  onResetAll: () => void;
  catalogTotal?: number;
  isLoading?: boolean;
  dynamicCats?: Array<{ id: string; name: string }>;
}) => {
  const sectionEmpty =
    !isLoading && (catalogTotal ?? filtered.length) === 0;
  const filtersEmpty = !sectionEmpty && filtered.length === 0;
  const title =
    cat === "all"
      ? "كل المنتجات"
      : dynamicCats
        ? dynamicCats.find((c) => c.id === cat)?.name ?? ""
        : CATS.find((c) => c.id === cat)?.name ?? "";
  return (
    <section className="mt-6 px-4">
      <RailHeader
        icon={Layers3}
        title={title}
        sub={`${toLatin(filtered.length)} منتج`}
        hue={hue}
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {filtered.map((p, i) => (
          <ProductCard
            key={p.id}
            p={p}
            onOpen={() => onOpen(p.id)}
            priority={i < 4}
          />
        ))}
      </div>
      {sectionEmpty && (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm font-bold text-foreground">
            لا توجد منتجات متاحة في هذا القسم حالياً
          </p>
          <p className="text-xs text-muted-foreground">
            سيتم إضافة المنتجات قريباً
          </p>
        </div>
      )}
      {filtersEmpty && (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-bold text-muted-foreground">
            لا توجد نتائج تطابق بحثك
          </p>
          <Button
            onClick={onResetAll}
            className="rounded-full bg-primary px-4 py-2 text-[11px] font-extrabold text-primary-foreground shadow-pill"
          >
            إعادة ضبط الفلاتر
          </Button>
        </div>
      )}
    </section>
  );
};
