/**
 * PredictiveRefillRail — Phase 26 "Predictive Consumable Restock".
 *
 * Reuses the existing Buy-Again signal as the predictive substrate (recent
 * order history → likely-to-deplete consumables). Pure presentation; the
 * predictive scoring lives inside `useBuyAgainProducts`.
 */
import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useBuyAgainProducts } from "@/hooks/useBuyAgainProducts";

/**
 * Defer the heavy edge-function fetch until the main thread is idle so the
 * Home page's first paint is never blocked by predictive AI work.
 */
const useIdleGate = (): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => {
        const cancel = (window as unknown as { cancelIdleCallback?: (id: number) => void })
          .cancelIdleCallback;
        if (typeof cancel === "function") cancel(id);
      };
    }
    const t = window.setTimeout(() => setReady(true), 800);
    return () => window.clearTimeout(t);
  }, []);
  return ready;
};

const PredictiveRefillRail = ({ title = "حان وقت التزود" }: { title?: string }) => {
  const idle = useIdleGate();
  const { products, isLoading } = useBuyAgainProducts(idle);

  if (isLoading) {
    return (
      <section dir="rtl">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Repeat className="h-4 w-4 text-foreground/60" />
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
        <Repeat className="h-4 w-4 text-primary" strokeWidth={2.4} />
        <h3 className="font-display text-base font-extrabold">{title}</h3>
        <span className="text-[11px] font-medium text-muted-foreground">— مبني على طلباتك</span>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x">
        {products.slice(0, 8).map((p) => (
          <div key={p.id} className="w-[44%] shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default PredictiveRefillRail;
