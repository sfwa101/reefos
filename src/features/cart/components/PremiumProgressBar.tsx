import { motion } from "framer-motion";
import { Gift, PartyPopper, Sparkles, Truck } from "lucide-react";

type Progress = {
  pct: number;
  label: string;
  done: boolean;
  /** Optional remaining EGP to next milestone — used for motivational copy */
  remaining?: number;
};

type Props = {
  progress: Progress;
};

/**
 * PremiumProgressBar — Phase 12.8.
 *
 * Animated, gradient-filled, milestone-aware progress bar with motivational
 * micro-copy. The icon shifts as the user climbs the ladder:
 *   < 33%  → Truck   (just starting)
 *   < 66%  → Sparkles (warming up)
 *   < 100% → Gift    (almost there)
 *   = 100% → Party   (unlocked)
 */
export const PremiumProgressBar = ({ progress }: Props) => {
  const pct = Math.max(0, Math.min(100, progress.pct));
  const Icon = progress.done
    ? PartyPopper
    : pct < 33
      ? Truck
      : pct < 66
        ? Sparkles
        : Gift;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/12 via-accent/12 to-primary/6 p-3 ring-1 ring-primary/20"
    >
      {/* Shimmer sweep — purely decorative */}
      <motion.div
        aria-hidden
        initial={{ x: "-100%" }}
        animate={{ x: "120%" }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
        className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="relative mb-2 flex items-center gap-2">
        <motion.div
          key={Icon.displayName ?? pct}
          initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 220 }}
          className={`flex h-7 w-7 items-center justify-center rounded-[10px] text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.55)] ${
            progress.done
              ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
              : "bg-gradient-to-br from-primary to-[hsl(var(--primary)/0.8)]"
          }`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </motion.div>
        <p className="flex-1 text-[11.5px] font-extrabold leading-tight text-foreground">
          {progress.label}
        </p>
        <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-foreground/70">
          {Math.round(pct)}%
        </span>
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`relative h-full rounded-full ${
            progress.done
              ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
              : "bg-gradient-to-r from-primary via-accent to-primary"
          }`}
          style={{ backgroundSize: "200% 100%" }}
        >
          <motion.div
            aria-hidden
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/30 to-white/0"
            style={{ backgroundSize: "200% 100%" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
