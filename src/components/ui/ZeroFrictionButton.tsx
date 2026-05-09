import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * Phase 60.1 — Zero-Friction Checkout Button.
 *
 * Cognitive UI law: small amounts (≤ 200) tap-to-pay, large amounts
 * require a 1s "hold to pay" gesture to prevent accidental confirms.
 * Pure semantic tokens — adapts to light/dark automatically.
 */
type Props = {
  amount: number;
  onPay: () => void;
  isPending?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
};

const HOLD_THRESHOLD = 200;
const HOLD_MS = 1000;

const vibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* noop */
  }
};

export const ZeroFrictionButton = ({
  amount,
  onPay,
  isPending = false,
  disabled = false,
  label,
  className = "",
}: Props) => {
  const requiresHold = amount > HOLD_THRESHOLD;
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const trigger = useCallback(() => {
    vibrate([15, 50, 15]);
    onPay();
  }, [onPay]);

  const handleTap = () => {
    if (requiresHold || disabled || isPending) return;
    vibrate(15);
    trigger();
  };

  const startHold = () => {
    if (!requiresHold || disabled || isPending) return;
    vibrate(15);
    setHolding(true);
    timerRef.current = setTimeout(() => {
      setHolding(false);
      trigger();
    }, HOLD_MS);
  };

  const cancelHold = () => {
    if (!requiresHold) return;
    clearTimer();
    setHolding(false);
  };

  const isDisabled = disabled || isPending;
  const text =
    label ??
    (isPending
      ? "جاري الدفع..."
      : requiresHold
        ? "اضغط مطوّلاً للدفع"
        : "ادفع الآن");

  return (
    <motion.button
      type="button"
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      disabled={isDisabled}
      onClick={handleTap}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-4 py-4 text-base font-extrabold text-primary-foreground shadow-md ring-1 ring-border transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {/* hold-fill overlay */}
      <AnimatePresence>
        {holding && (
          <motion.span
            key="fill"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: HOLD_MS / 1000, ease: "linear" }}
            className="absolute inset-y-0 start-0 bg-primary-foreground/20"
          />
        )}
      </AnimatePresence>

      <span className="relative flex items-center gap-2">
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ShieldCheck className="h-5 w-5" />
        )}
        <span>{text}</span>
      </span>
    </motion.button>
  );
};

export default ZeroFrictionButton;
