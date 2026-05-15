/**
 * GlassEmptyState — Steel Glass fallback cell.
 *
 * Centered empty-state with a gradient halo icon (matches GlassKpiCard
 * accents), a display title, muted description, and an optional CTA.
 * Pure presentation; the consumer wires the action handler.
 */
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Accent = "primary" | "success" | "warning" | "info" | "accent";

const ACCENT_HALO: Record<Accent, string> = {
  primary: "from-primary/30 to-primary/5 text-primary",
  success: "from-emerald-400/30 to-emerald-400/5 text-emerald-600",
  warning: "from-amber-400/30 to-amber-400/5 text-amber-600",
  info: "from-sky-400/30 to-sky-400/5 text-sky-600",
  accent: "from-violet-400/30 to-violet-400/5 text-violet-600",
};

export type GlassEmptyStateProps = {
  icon?: LucideIcon;
  accent?: Accent;
  title: ReactNode;
  description?: ReactNode;
  /** Optional CTA. When provided, `onAction` is called on click. */
  actionLabel?: ReactNode;
  onAction?: () => void;
  /** Render a custom action node instead of the built-in button. */
  action?: ReactNode;
  className?: string;
};

export function GlassEmptyState({
  icon: Icon = Inbox,
  accent = "primary",
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}: GlassEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className={cn(
        "glass-steel relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-white/40 px-6 py-10 text-center shadow-soft",
        className,
      )}
      dir="rtl"
    >
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br shadow-elevated",
          ACCENT_HALO[accent],
        )}
      >
        <span className="absolute inset-0 rounded-3xl bg-white/40 backdrop-blur-md" />
        <Icon className="relative h-7 w-7" strokeWidth={2.2} />
      </div>

      <h3 className="font-display text-[17px] font-extrabold tracking-tight">{title}</h3>
      {description ? (
        <p className="max-w-sm text-[12.5px] text-foreground/65">{description}</p>
      ) : null}

      {action
        ? action
        : actionLabel
          ? (
              <Button
                type="button"
                onClick={onAction}
                className="mt-1 rounded-2xl bg-gradient-to-br from-primary to-primary-glow px-4 text-[12.5px] font-extrabold text-primary-foreground shadow-elevated hover:opacity-95"
              >
                {actionLabel}
              </Button>
            )
          : null}
    </motion.div>
  );
}

export default GlassEmptyState;
