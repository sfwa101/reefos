import { Link } from "@tanstack/react-router";
import { ChevronDown, MapPin, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartTotal } from "@/context/CartContext";
import { useLocation as useDeliveryLocation } from "@/context/LocationContext";
import { toLatin } from "@/lib/format";

/**
 * Smart, edge-to-edge header — Phase 11.5.
 *
 * Right (RTL: visually right): compact location pill (MapPin + zone + ChevronDown).
 * Left  (RTL: visually left):  smart cart capsule. Icon stays pinned to the
 *   visually-left edge; the compact-notated price (e.g. "15.5K ج") expands
 *   inline to its right via a width+opacity animation.
 *
 * Compact notation rationale: long EGP totals (e.g. 15,500) blow out the
 * capsule width on small viewports. Using `Intl.NumberFormat('en-US', {
 * notation: 'compact', maximumFractionDigits: 1 })` we render "15.5K" so the
 * capsule never grows past ~96px regardless of basket size, while keeping
 * Latin digits (ar/eg locale would emit "١٥٫٥ ألف"). For totals below 1000
 * the formatter naturally returns the plain integer ("450"), so small carts
 * still read literally — no jarring "0.5K" for sub-thousand baskets.
 */

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fmtCompactMoney = (n: number) => `${toLatin(compactFmt.format(Math.round(n)))} ج`;

const TopBar = () => {
  const total = useCartTotal();
  const { zone } = useDeliveryLocation();

  const expanded = total > 0;

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 bg-background/80 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-3 px-4 lg:max-w-[1400px] lg:px-6">
        {/* Right side (RTL): compact location pill */}
        <Link
          to="/account/addresses"
          aria-label="تغيير العنوان"
          className="inline-flex h-11 min-h-[44px] items-center gap-1.5 rounded-full bg-secondary/60 px-3 text-[13px] font-medium text-foreground ring-1 ring-border/40 transition active:scale-[0.97]"
        >
          <MapPin className="h-4 w-4 text-primary" strokeWidth={2.4} />
          <span className="font-bold">المنزل</span>
          <span className="text-muted-foreground">،</span>
          <span className="text-muted-foreground">{zone.shortName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.4} />
        </Link>

        {/* Left side (RTL): smart cart capsule — icon LEFT, price RIGHT */}
        <Link
          to="/cart"
          aria-label="السلة"
          className="relative inline-flex h-11 min-w-11 items-center justify-start overflow-hidden rounded-full bg-primary/10 text-primary backdrop-blur-md ring-1 ring-primary/15 transition active:scale-[0.97]"
          dir="ltr"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center">
            <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.span
                key="amount"
                initial={{ width: 0, opacity: 0, marginRight: 0, paddingRight: 0 }}
                animate={{ width: "auto", opacity: 1, marginRight: 2, paddingRight: 14 }}
                exit={{ width: 0, opacity: 0, marginRight: 0, paddingRight: 0 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden whitespace-nowrap font-display text-sm font-bold tabular-nums"
              >
                {fmtCompactMoney(total)}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
