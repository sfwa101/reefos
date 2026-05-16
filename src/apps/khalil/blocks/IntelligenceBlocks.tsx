/**
 * Khalil — Sovereign Intelligence blocks (P3.1).
 *
 * Three SDUI blocks rendered from descriptor props alone — no client-side
 * inference, no Supabase imports, all copy via `kt()`.
 *
 *   khalil.intelligence.signal  — top critical signal chip
 *   khalil.intelligence.nudge   — short, explainable nudge
 *   khalil.intelligence.focus   — weekly focus card
 */
import { AlertTriangle, Compass, Sparkle } from "lucide-react";
import { kt } from "@/core/khalil";

type Severity = "low" | "medium" | "high";

function sevTone(s: Severity): string {
  if (s === "high") return "border-destructive/40 bg-destructive/5 text-destructive";
  if (s === "medium") return "border-amber-400/50 bg-amber-50/50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200";
  return "border-emerald-400/40 bg-emerald-50/40 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200";
}

export function CriticalSignalBlock(props: {
  signalKey: string;
  severity: Severity;
  score: number;
  explanationKey: string;
}) {
  return (
    <section
      aria-label={kt("khalil.intelligence.signal.label")}
      className={`rounded-3xl border p-4 ${sevTone(props.severity)}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden className="h-5 w-5 shrink-0" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
            {kt("khalil.intelligence.signal.label")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {kt(`khalil.intelligence.signal.${props.signalKey}.title`)}
          </p>
          <p className="mt-1 text-sm opacity-90">{kt(props.explanationKey)}</p>
        </div>
      </div>
    </section>
  );
}

export function NudgeBlock(props: {
  nudgeId: string;
  kind: string;
  titleKey: string;
  bodyKey: string;
  severity: Severity;
}) {
  return (
    <section
      aria-label={kt("khalil.intelligence.nudge.label")}
      className={`rounded-3xl border p-4 ${sevTone(props.severity)}`}
    >
      <div className="flex items-start gap-3">
        <Sparkle aria-hidden className="h-5 w-5 shrink-0" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
            {kt("khalil.intelligence.nudge.label")}
          </p>
          <p className="mt-1 text-sm font-semibold">{kt(props.titleKey)}</p>
          <p className="mt-1 text-sm opacity-90">{kt(props.bodyKey)}</p>
        </div>
      </div>
    </section>
  );
}

export function WeeklyFocusBlock(props: {
  primaryFocus: string;
  secondaryFocus: string;
  rationaleKey: string;
  spiritualEmphasis: string;
  bodyEmphasis: string;
  recoveryEmphasis: string;
}) {
  return (
    <section
      aria-label={kt("khalil.intelligence.focus.label")}
      className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/60 via-violet-50/40 to-white p-5 shadow-sm dark:border-indigo-900/30 dark:from-indigo-950/20 dark:via-violet-950/10 dark:to-background"
    >
      <div className="flex items-start gap-3">
        <Compass aria-hidden className="h-5 w-5 shrink-0 text-indigo-700 dark:text-indigo-300" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700/80 dark:text-indigo-300/80">
            {kt("khalil.intelligence.focus.label")}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {kt(`khalil.intelligence.focus.area.${props.primaryFocus}`)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {kt("khalil.intelligence.focus.secondary")}:{" "}
            {kt(`khalil.intelligence.focus.area.${props.secondaryFocus}`)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{kt(props.rationaleKey)}</p>
        </div>
      </div>
    </section>
  );
}
