import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useCartErrors } from "@/core/orders/runtime/react/CartProvider";

/**
 * Phase 2.J — Graceful Failure UI.
 * Renders a warning banner when one or more cart lines fail engine
 * validation (e.g. Sweets Type C added without a booking date).
 *
 * Mobile-first: stacked layout, large touch targets, no horizontal scroll.
 * The Checkout button is disabled by the parent (Cart.tsx) while this
 * banner is visible — see `useCartHasErrors`.
 */
export const CartPricingErrorsBanner = () => {
  const errors = useCartErrors();
  if (errors.length === 0) return null;

  return (
    <motion.section
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-destructive/10 p-3 ring-1 ring-destructive/30"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-destructive/15 text-destructive">
          <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] font-extrabold text-destructive">
            بعض المنتجات تحتاج إلى استكمال بياناتها
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-destructive/80">
            لا يمكن إتمام الطلب حتى يتم تصحيح بيانات التسعير التالية:
          </p>

          <ul className="mt-2 space-y-1.5">
            {errors.map((e) => (
              <li
                key={`${e.productId}:${e.code}`}
                className="rounded-xl bg-background/60 p-2 text-[11px] ring-1 ring-destructive/20"
              >
                <p className="truncate font-extrabold text-foreground">
                  {e.productName}
                </p>
                <p className="mt-0.5 text-[10.5px] font-bold leading-snug text-muted-foreground">
                  {e.message}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
};

export default CartPricingErrorsBanner;
