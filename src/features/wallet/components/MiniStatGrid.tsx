import { motion } from "framer-motion";
import { Banknote, Gift, Users } from "lucide-react";
import { toLatin } from "@/lib/format";

/**
 * MiniStatGrid — compact 3-tile reward summary
 * (coupons / cashback / successful referrals).
 */
export const MiniStatGrid = ({
  coupons,
  cashback,
  refs,
}: {
  coupons: number;
  cashback: number;
  refs: number;
}) => (
  <section className="grid grid-cols-3 gap-2.5">
    {[
      { label: "كوبوناتي", value: toLatin(coupons), icon: Gift },
      { label: "كاش باك", value: toLatin(Math.round(cashback)), icon: Banknote, suffix: "ج" },
      { label: "إحالات", value: toLatin(refs), icon: Users },
    ].map((p, i) => (
      <motion.div
        key={p.label}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 * i, duration: 0.35 }}
        className="glass-strong rounded-2xl p-3 shadow-soft"
      >
        <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <p.icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </div>
        <p className="font-display text-lg font-extrabold tabular-nums">
          {p.value}
          {p.suffix && <span className="text-[10px] text-muted-foreground"> {p.suffix}</span>}
        </p>
        <p className="text-[10px] text-muted-foreground">{p.label}</p>
      </motion.div>
    ))}
  </section>
);
