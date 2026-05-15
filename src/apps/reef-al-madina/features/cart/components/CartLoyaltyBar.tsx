import { motion } from "framer-motion";
import { Sparkles, Gift, Lock } from "lucide-react";
import { useCartLoyalty } from "@/core/orders/runtime/react/CartProvider";
import { toLatin } from "@/lib/format";
import { getTier, type TierKey } from "@/lib/tiers";

/**
 * Phase 8 — In-cart loyalty bar.
 *
 * Pure presentation: reads `useCartLoyalty()` (which routes everything
 * through `pricingEngine`) and renders an animated gold/orange ribbon
 * showing the customer how many points the current order will earn.
 *
 * Branches:
 *   • Guest         → "سجّل الدخول لتجمع نقاط الولاء" (locked CTA).
 *   • Authenticated → "ستحصل على X نقطة ✨" + per-line bonus chips.
 *
 * No math is performed here — every number comes pre-computed from the
 * engine via `useCartLoyalty()`.
 */
export const CartLoyaltyBar = () => {
  const loyalty = useCartLoyalty();

  // Guests: invite to sign in but never compute a fake number.
  if (loyalty.tier === "guest") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500/10 via-orange-400/10 to-yellow-300/5 p-3 ring-1 ring-amber-400/30"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
          <Lock className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <p className="flex-1 text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
          سجّل الدخول لتجمع نقاط الولاء عند كل طلب ✨
        </p>
      </motion.div>
    );
  }

  if (loyalty.totalPoints <= 0) return null;

  const tier = getTier(loyalty.tier as TierKey);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-amber-500/15 via-orange-400/10 to-yellow-300/10 p-3 ring-1 ring-amber-400/40"
    >
      {/* Shimmer */}
      <motion.div
        aria-hidden
        initial={{ x: "-100%" }}
        animate={{ x: "120%" }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <div className="relative flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br ${tier.gradient} text-white shadow-sm`}
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.6} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-amber-900/80 dark:text-amber-200/80">
            مكافأة هذا الطلب • فئة {tier.label}
          </p>
          <p className="font-display text-[15px] font-extrabold text-amber-900 dark:text-amber-100">
            ستحصل على{" "}
            <span className="tabular-nums text-amber-700 dark:text-amber-300">
              {toLatin(loyalty.totalPoints)}
            </span>{" "}
            نقطة ولاء ✨
          </p>
        </div>
      </div>

      {/* Per-line bonus chips (Offers / gift products) */}
      {loyalty.bonusLines.length > 0 && (
        <div className="relative mt-2 flex flex-wrap gap-1.5 border-t border-amber-400/20 pt-2">
          {loyalty.bonusLines.map((b) => (
            <span
              key={b.productId}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm"
              title={b.productName}
            >
              <Gift className="h-3 w-3" strokeWidth={2.6} />+{toLatin(
                b.bonusPoints,
              )}{" "}
              نقطة هدية
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
};
