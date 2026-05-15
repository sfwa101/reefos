/**
 * HakimPredictiveBasket — 1-tap predictive cart UI (Phase 5)
 * -----------------------------------------------------------
 * Live wiring to the `predict_basket` edge function via
 * `usePredictBasket()`. Shows a skeleton during fetch, gracefully
 * hides on empty/error, and feeds the predicted lines into the
 * 1-tap `replaceCart` action.
 */
import { useMemo } from "react";
import { Sparkles, ShoppingBasket } from "lucide-react";
import { useReplaceCart } from "@/hooks/useReplaceCart";
import { usePredictBasket, type PredictedBasketLine } from "@/core/hakim-ai/hooks/usePredictBasket";
import { Skeleton } from "@/components/ui/skeleton";
import { toLatin } from "@/lib/format";
import type { CartLine } from "@/core/orders/runtime/types";
import { sumCanonicalGrandTotals } from "@/core/orders/runtime/lineTotals";
/** @deprecated Wave P-B B-3 — bridge type; predicted basket synthesizes a Product to feed the deprecated CartLine.product field. */
import type { Product } from "@/core/catalog/legacyProduct.types";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

const lineToCartLine = (l: PredictedBasketLine): CartLine => {
  const product: Product = {
    id: l.product_id,
    name: l.name,
    unit: l.unit,
    price: l.price,
    image: l.image || FALLBACK_IMG,
    category: l.category,
    source: "supermarket",
  } as Product;
  return { product, qty: l.quantity };
};

export function HakimPredictiveBasket({ className = "" }: { className?: string }) {
  const { data, isLoading, isError } = usePredictBasket();
  const replaceCart = useReplaceCart();

  const lines = useMemo(() => (data?.basket ?? []).map(lineToCartLine), [data]);
  const total = useMemo(
    () => sumCanonicalGrandTotals(lines),
    [lines],
  );

  if (isLoading) {
    return (
      <section
        className={`relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-4 text-primary-foreground shadow-tile ${className}`}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-2xl bg-primary-foreground/30" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded-full bg-primary-foreground/30" />
            <Skeleton className="h-4 w-40 rounded-full bg-primary-foreground/30" />
          </div>
        </div>
        <Skeleton className="mt-3 h-7 w-full rounded-full bg-primary-foreground/20" />
        <Skeleton className="mt-3 h-10 w-full rounded-2xl bg-primary-foreground/40" />
      </section>
    );
  }

  if (isError || !data || data.empty || lines.length === 0) return null;

  const handleApply = () => {
    replaceCart(lines, { message: "تم استبدال السلة بسلة الحكيم" });
  };

  return (
    <section
      className={`relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-4 text-primary-foreground shadow-tile ${className}`}
    >
      <div className="absolute -top-8 -right-6 h-32 w-32 rounded-full bg-primary-foreground/20 blur-2xl" />
      <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-primary-foreground/10 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-foreground/20 backdrop-blur">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/25 px-2 py-0.5 text-[10px] font-extrabold">
            الحكيم AI · تنبؤ ذكي
          </span>
          <h3 className="mt-1.5 font-display text-base font-extrabold leading-tight">
            {data.headline}
          </h3>
          <p className="text-[11px] opacity-90">
            {toLatin(lines.length)} منتجات · تقدير {toLatin(Math.round(total))} ج.م
            {data.confidence ? ` · ثقة ${toLatin(Math.round(data.confidence * 100))}%` : ""}
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {lines.slice(0, 6).map((l) => (
          <div
            key={l.product.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2 py-1 text-[10.5px] font-bold backdrop-blur"
          >
            <ShoppingBasket className="h-3 w-3 opacity-80" />
            <span className="max-w-[6rem] truncate">{l.product.name}</span>
            <span className="opacity-80 tabular-nums">×{toLatin(l.qty)}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleApply}
        className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-foreground py-2.5 text-[13px] font-extrabold text-fuchsia-700 shadow-pill transition active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4" />
        استبدل سلتي بضغطة واحدة
      </button>
    </section>
  );
}

export default HakimPredictiveBasket;
