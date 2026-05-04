import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useCartIncentives } from "@/features/cart/hooks/useCartIncentives";
import { toLatin } from "@/lib/format";

interface Props {
  readonly subtotal: number;
}

/**
 * Phase 9 — Multi-step incentive ladder rendered above the cart
 * summary. Pure presentation, fed entirely by `useCartIncentives`.
 *
 * Mobile-first: 375px viewport renders 3 nodes + connectors with
 * comfortable touch targets and readable labels.
 */
export const CartIncentiveProgress = ({ subtotal }: Props) => {
  const { milestones, nextIndex, remainingToNext } = useCartIncentives(
    subtotal,
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 p-3 ring-1 ring-primary/20"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-extrabold text-foreground">
          🎯 مكافآت السلة
        </p>
        {nextIndex !== -1 && remainingToNext > 0 ? (
          <p className="text-[10px] font-bold text-muted-foreground">
            تبقّى{" "}
            <span className="tabular-nums text-primary">
              {toLatin(Math.ceil(remainingToNext))}
            </span>{" "}
            ج.م
          </p>
        ) : (
          <p className="text-[10px] font-extrabold text-emerald-600">
            كل المكافآت مفتوحة ✨
          </p>
        )}
      </div>

      <ol className="relative flex items-start justify-between gap-1">
        {milestones.map((m, i) => {
          const Icon = m.icon;
          const isCurrent = i === nextIndex;
          return (
            <li
              key={m.key}
              className="relative flex flex-1 flex-col items-center gap-1.5"
            >
              {/* Connector to previous */}
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1/2 top-4 -z-0 h-1 w-full -translate-y-1/2 rounded-full bg-muted"
                >
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{
                      width: `${milestones[i - 1].unlocked ? (m.unlocked ? 100 : m.progress * 100) : 0}%`,
                    }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="block h-full rounded-full bg-gradient-to-l from-primary to-accent"
                  />
                </span>
              )}

              {/* Node */}
              <motion.div
                animate={{
                  scale: isCurrent ? [1, 1.08, 1] : 1,
                }}
                transition={
                  isCurrent
                    ? { duration: 1.6, repeat: Infinity }
                    : { duration: 0.2 }
                }
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-[10px] shadow-sm ${
                  m.unlocked
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                    : isCurrent
                      ? "bg-gradient-to-br from-primary to-accent text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {m.unlocked ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <Icon className="h-4 w-4" strokeWidth={2.4} />
                )}
              </motion.div>

              <div className="text-center">
                <p
                  className={`text-[10px] font-extrabold leading-tight ${
                    m.unlocked
                      ? "text-emerald-700 dark:text-emerald-300"
                      : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {m.title}
                </p>
                <p className="text-[9px] font-bold tabular-nums text-muted-foreground">
                  {toLatin(m.threshold)} ج.م
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
};
