/**
 * HakimPredictiveBasket — 1-tap predictive cart UI (Phase 4.4 skeleton)
 * ----------------------------------------------------------------------
 * Sits at the top of the Cart (and later Home empty state). Surfaces a
 * single "Hakim's Weekly Basket" suggestion the user can accept with one
 * tap — replacing the current cart entirely.
 *
 * Part 5 will swap `mockSuggestion` for the `predict_basket(_user_id)`
 * edge-function call against `user_product_frequency`. The component
 * contract (lines + 1-tap apply) stays identical.
 */
import { useMemo } from "react";
import { Sparkles, ShoppingBasket } from "lucide-react";
import { useHomeProductsQuery } from "@/hooks/useProductsQuery";
import { useReplaceCart } from "@/hooks/useReplaceCart";
import { toLatin } from "@/lib/format";
import type { CartLine } from "@/store/useCartStore";

const SUGGESTED_QTY: Record<string, number> = {
  // best-effort — we just take the first N capped products and map qty=1
};

export function HakimPredictiveBasket({ className = "" }: { className?: string }) {
  // Mock: pull the first 6 items the home query already cached.
  const { data: catalog = [] } = useHomeProductsQuery(48, "home");
  const replaceCart = useReplaceCart();

  const suggestion = useMemo(() => {
    const picks = catalog.slice(0, 6).map((p) => ({
      product: p,
      qty: SUGGESTED_QTY[p.id] ?? 1,
    })) as CartLine[];
    const total = picks.reduce((s, l) => s + l.product.price * l.qty, 0);
    return { lines: picks, total };
  }, [catalog]);

  if (suggestion.lines.length === 0) return null;

  const handleApply = () => {
    replaceCart(suggestion.lines, { message: "تم استبدال السلة بسلة الحكيم" });
  };

  return (
    <section
      className={`relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-4 text-white shadow-tile ${className}`}
    >
      <div className="absolute -top-8 -right-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-extrabold">
            الحكيم AI · تجربة
          </span>
          <h3 className="mt-1.5 font-display text-base font-extrabold leading-tight">
            سلة الحكيم الأسبوعية
          </h3>
          <p className="text-[11px] opacity-90">
            {toLatin(suggestion.lines.length)} منتجات مختارة لك · تقدير {toLatin(Math.round(suggestion.total))} ج.م
          </p>
        </div>
      </div>

      {/* Mini line preview */}
      <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
        {suggestion.lines.slice(0, 6).map((l) => (
          <div
            key={l.product.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2 py-1 text-[10.5px] font-bold backdrop-blur"
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
        className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-2.5 text-[13px] font-extrabold text-fuchsia-700 shadow-pill transition active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4" />
        استبدل سلتي بضغطة واحدة
      </button>
    </section>
  );
}

export default HakimPredictiveBasket;
