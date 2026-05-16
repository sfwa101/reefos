/**
 * Khalil — `khalil.recovery.banner` block (P2.4).
 *
 * Visible only when the server orchestrator includes this descriptor —
 * i.e. when recovery state is `soft` or `hard`. The block is read-only;
 * the user can't dismiss it (state is server-owned, audit-sensitive).
 *
 * Tone: calm, non-punitive. Copy through `kt()` only — no literals.
 */
import { HeartPulse, Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { kt, type RecoveryMode } from "@/core/khalil";

interface Props {
  mode?: RecoveryMode;
}

export function RecoveryBannerBlock({ mode = "soft" }: Props) {
  const isHard = mode === "hard";
  const Icon = isHard ? Shield : HeartPulse;
  const body = isHard
    ? kt("khalil.recovery.banner.hard")
    : kt("khalil.recovery.banner.soft");
  const stateLabel = isHard
    ? kt("khalil.recovery.state.hard")
    : kt("khalil.recovery.state.soft");

  return (
    <Link
      to="/khalil/recovery"
      className="block rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-white p-5 shadow-sm transition hover:shadow-md dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-background"
      aria-label={kt("khalil.recovery.title")}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
            {stateLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">{body}</p>
        </div>
      </div>
    </Link>
  );
}
