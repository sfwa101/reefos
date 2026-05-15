/**
 * GlassKpiCard — Steel Glass KPI tile (WAVE UI-7).
 *
 * Reusable Apple-inspired glass card for the admin command center.
 * Variants control accent color (icon halo + delta tint).
 *
 * Constitution v5.1: pure presentation, no data fetching, no supabase.
 */
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Accent = "primary" | "success" | "warning" | "info" | "accent";

const ACCENT_RING: Record<Accent, string> = {
  primary: "from-primary/25 to-primary/5 text-primary",
  success: "from-emerald-400/25 to-emerald-400/5 text-emerald-600",
  warning: "from-amber-400/25 to-amber-400/5 text-amber-600",
  info: "from-sky-400/25 to-sky-400/5 text-sky-600",
  accent: "from-violet-400/25 to-violet-400/5 text-violet-600",
};

export type GlassKpiCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: Accent;
  /** Percentage change vs previous period; positive = green, negative = red. */
  delta?: number | null;
  /** Optional sub-text under the value (e.g., "آخر 24 ساعة"). */
  hint?: string;
  loading?: boolean;
  className?: string;
};

export function GlassKpiCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  delta,
  hint,
  loading = false,
  className,
}: GlassKpiCardProps) {
  const positive = typeof delta === "number" && delta >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className={cn(
        "glass-steel relative overflow-hidden rounded-3xl border border-white/40 p-4 shadow-elevated md:p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          aria-hidden
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/40 backdrop-blur-md",
            ACCENT_RING[accent],
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>

        {typeof delta === "number" && !loading && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold",
              positive
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-rose-500/15 text-rose-600",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.6} />
            ) : (
              <ArrowDownRight className="h-3 w-3" strokeWidth={2.6} />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-28 rounded-xl" />
        ) : (
          <p className="font-display mt-1.5 text-2xl font-extrabold leading-none tracking-tight md:text-3xl">
            {value}
          </p>
        )}
        {hint && (
          <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
            {hint}
          </p>
        )}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-gradient-to-br from-white/40 to-transparent blur-2xl"
      />
    </motion.div>
  );
}
