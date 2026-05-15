import { Check, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomCTA from "@/components/BottomCTA";
import { fmtMoney, toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface Props {
  qty: number;
  setQty: (updater: (q: number) => number) => void;
  total: number;
  priceFlash: number;
  addBurst: boolean;
  onAdd: () => void;
  ctaLabel: string;
  displayTotal?: number;
}

/**
 * Sticky bottom Add-to-Cart CTA — always visible on mobile.
 * Verbatim extraction from ProductDetail.tsx.
 */
const StickyAddCTA = ({
  qty, setQty, total, priceFlash, addBurst, onAdd, ctaLabel, displayTotal,
}: Props) => {
  const finalTotal = displayTotal ?? total;
  return (
    <BottomCTA>
      <div className="glass-strong flex items-center gap-3 rounded-[1.5rem] p-3 shadow-float">
        <div className="flex items-center gap-1 rounded-full bg-foreground/5 p-1">
          <Button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-soft active:scale-90"
            aria-label="إنقاص"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-6 text-center font-display text-base font-extrabold tabular-nums">
            {toLatin(qty)}
          </span>
          <Button
            onClick={() => setQty((q) => q + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90"
            aria-label="زيادة"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <motion.button
          onClick={onAdd}
          animate={addBurst ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-primary py-2.5 text-primary-foreground shadow-pill transition active:scale-[0.98]"
        >
          <AnimatePresence mode="wait">
            {addBurst ? (
              <motion.span
                key="added"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 text-sm font-extrabold"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                تمت الإضافة للسلة
              </motion.span>
            ) : (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <span className="text-[11px] font-medium opacity-85">{ctaLabel}</span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={priceFlash}
                    initial={{ opacity: 0, y: -6, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.92 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="font-display text-base font-extrabold tabular-nums"
                  >
                    {fmtMoney(finalTotal)}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </BottomCTA>
  );
};

export default StickyAddCTA;
