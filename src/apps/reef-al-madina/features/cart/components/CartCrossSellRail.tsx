import { motion } from "framer-motion";
import { Plus, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { toLatin } from "@/lib/format";
import { fireMiniConfetti } from "@/lib/confetti";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
/** @deprecated Wave P-B B-3 — bridge type; the rail will consume `ProductCardVM[]` after §2.E migrates. */
import type { Product } from "@/core/catalog/legacyProduct.types";
import type { CartLineMeta } from "@/core/orders/runtime/react/CartProvider";

type Props = {
  items: Product[];
  add: (p: Product, qty?: number, meta?: CartLineMeta) => void;
};

/**
 * "أضف إلى طلبك السريع" — horizontal cross-sell rail rendered below cart lines.
 *
 * WAVE UI-1: Always renders (with 3 skeleton placeholders when empty) so the
 * checkout shell keeps a stable rhythm. The skeleton state is the visual hook
 * that Hakim Predictive Basket will fill in once wired in WAVE UI-2.
 */
export const CartCrossSellRail = ({ items, add }: Props) => {
  const isEmpty = items.length === 0;

  return (
    <section className="-mx-4 overflow-hidden rounded-none bg-gradient-to-br from-primary/[0.06] via-accent/[0.05] to-primary/[0.03] px-4 py-3 ring-1 ring-primary/15 sm:mx-0 sm:rounded-2xl">
      <header className="mb-2.5 flex items-baseline justify-between px-1">
        <h2 className="flex items-center gap-1.5 font-display text-[12.5px] font-extrabold text-foreground/90">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-pill">
            <Zap className="h-3 w-3" strokeWidth={2.6} />
          </span>
          أضف إلى طلبك السريع
        </h2>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <Sparkles className="h-2.5 w-2.5 text-accent" />
          {isEmpty ? "يحدد لك Hakim قريباً" : "اختيارات ذكية"}
        </span>
      </header>

      <ScrollArea dir="rtl" className="-mx-4 px-4">
        <div className="flex gap-2.5 pb-2">
          {isEmpty
            ? Array.from({ length: 3 }).map((_, i) => (
                <CrossSellSkeleton key={`skeleton-${i}`} delay={i * 0.08} />
              ))
            : items.map((p) => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    add(p, 1);
                    fireMiniConfetti();
                    toast.success(`تمت إضافة ${p.name}`);
                  }}
                  className="relative flex w-[112px] shrink-0 flex-col overflow-hidden rounded-2xl bg-card p-1.5 text-right shadow-[0_4px_14px_-8px_rgba(0,0,0,0.18)] ring-1 ring-border/40 transition active:scale-[0.97]"
                >
                  <div className="relative mb-1.5 h-[72px] w-full overflow-hidden rounded-xl">
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  </div>
                  <p className="line-clamp-2 min-h-[26px] text-[10.5px] font-bold leading-tight">
                    {p.name}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-display text-[11.5px] font-extrabold text-primary tabular-nums">
                      {toLatin(p.price)} ج
                    </span>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary)/0.8)] text-primary-foreground shadow-pill">
                      <Plus className="h-3 w-3" strokeWidth={3} />
                    </div>
                  </div>
                </motion.button>
              ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </section>
  );
};

const CrossSellSkeleton = ({ delay }: { delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className="relative flex w-[112px] shrink-0 flex-col overflow-hidden rounded-2xl bg-card/70 p-1.5 ring-1 ring-border/30"
    aria-hidden
  >
    <Skeleton className="mb-1.5 h-[72px] w-full rounded-xl" />
    <Skeleton className="mb-1 h-2.5 w-[85%] rounded-full" />
    <Skeleton className="mb-1.5 h-2.5 w-[60%] rounded-full" />
    <div className="mt-1 flex items-center justify-between">
      <Skeleton className="h-3 w-10 rounded-full" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
  </motion.div>
);
