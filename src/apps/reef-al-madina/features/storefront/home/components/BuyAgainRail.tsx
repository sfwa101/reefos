/**
 * BuyAgainRail — SDUI section wrapper around `useBuyAgainProducts`.
 *
 * Reads the signed-in customer's recent orders via the Sovereign Matrix
 * and renders a horizontal rail of ProductCards. Hides itself when the
 * user has no order history (anonymous or new accounts).
 */
import { RotateCcw } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useBuyAgainProducts } from "@/hooks/useBuyAgainProducts";

const BuyAgainRail = ({ title = "اشتر مجدداً" }: { title?: string }) => {
  const { products, isLoading } = useBuyAgainProducts();

  if (isLoading) {
    return (
      <section dir="rtl">
        <div className="mb-3 flex items-center gap-2 px-1">
          <RotateCcw className="h-4 w-4 text-foreground/60" />
          <h3 className="font-display text-base font-extrabold">{title}</h3>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-hidden px-4 pb-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 w-[44%] shrink-0 animate-pulse rounded-2xl bg-foreground/5" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section dir="rtl">
      <div className="mb-3 flex items-center gap-2 px-1">
        <RotateCcw className="h-4 w-4 text-foreground/60" />
        <h3 className="font-display text-base font-extrabold">{title}</h3>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x">
        {products.map((p) => (
          <div key={p.id} className="w-[44%] shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default BuyAgainRail;
