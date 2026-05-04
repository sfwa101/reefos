import { Link } from "@tanstack/react-router";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCartTotal } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useDeliveryLocation } from "@/context/LocationContext";
import { fmtMoney } from "@/lib/format";
import { getSmartGreeting } from "@/lib/personalize";

/**
 * Smart, edge-to-edge header — Phase 11.1.
 *
 * Left  (RTL: visually right): Address selector + dynamic greeting.
 * Right (RTL: visually left): "Smart Cart Capsule" — a thin bag icon
 *   that, on every cart-total increase, expands rightward into a
 *   glass capsule revealing the new total for ~3s, then collapses
 *   back to the slim icon. Implementation:
 *     - Track the previous total in a ref.
 *     - When `total > prevTotal`, set `expanded = true` and start a
 *       3000ms timer (cleared on subsequent expansions).
 *     - Render the price inside `<AnimatePresence>` with a width +
 *       opacity transition so it physically grows from the icon
 *       toward the inline-end (which in RTL = visually leftward, the
 *       natural "outward" direction here).
 *     - No badge counter — the capsule itself signals change.
 */
const TopBar = () => {
  const total = useCartTotal();
  const { profile } = useAuth();
  const { zone } = useDeliveryLocation();

  const [greeting, setGreeting] = useState("أهلاً بك");
  useEffect(() => setGreeting(getSmartGreeting()), []);

  const firstName = profile?.full_name?.split(" ")[0];

  // Smart capsule: stays open whenever cart has value
  const expanded = total > 0;

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 bg-background/80 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex w-full max-w-md items-start justify-between gap-3 px-4 py-2.5 lg:max-w-[1400px] lg:px-6">
        {/* Right side (RTL): address + greeting stack */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            to="/account/addresses"
            aria-label="تغيير العنوان"
            className="inline-flex h-11 min-h-[44px] items-center gap-1 self-start text-[12.5px] font-medium text-muted-foreground transition active:scale-[0.98]"
          >
            <span className="font-bold text-foreground">المنزل</span>
            <span className="text-muted-foreground">،</span>
            <span>{zone.shortName}</span>
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.4} />
          </Link>
          <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
            {greeting}
            {firstName ? <span className="text-primary">، {firstName}</span> : null}
            <span className="ms-1">✨</span>
          </h1>
        </div>

        {/* Left side (RTL): smart cart capsule — icon on the LEFT, price on the RIGHT */}
        <Link
          to="/cart"
          aria-label="السلة"
          className="relative mt-1 inline-flex h-11 min-w-11 items-center justify-start overflow-hidden rounded-full bg-primary/10 text-primary backdrop-blur-md ring-1 ring-primary/15 transition active:scale-[0.97]"
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
                {fmtMoney(total)}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
