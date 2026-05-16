/**
 * Khalil — shared state primitives (loading / empty / error).
 *
 * Every Khalil block must own its own loading + empty + error state
 * (p1-composable-dashboard.md). These primitives keep visual treatment
 * uniform without bespoke pages.
 */
import type { ReactNode } from "react";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { kt } from "@/core/khalil";

export function KhalilLoading({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 rounded-2xl bg-secondary/40 p-6 text-sm text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label ?? kt("khalil.state.loading")}</span>
    </div>
  );
}

export function KhalilEmpty({
  title,
  body,
  action,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-secondary/40 p-8 text-center">
      <Sparkles className="h-6 w-6 text-muted-foreground" aria-hidden />
      <h3 className="font-display text-base font-bold text-foreground">
        {title ?? kt("khalil.state.empty.title")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {body ?? kt("khalil.state.empty.body")}
      </p>
      {action}
    </div>
  );
}

export function KhalilError({
  onRetry,
  title,
  body,
}: {
  onRetry?: () => void;
  title?: string;
  body?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
    >
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
      <h3 className="font-display text-sm font-bold text-foreground">
        {title ?? kt("khalil.state.error.title")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {body ?? kt("khalil.state.error.body")}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          {kt("khalil.state.error.retry")}
        </button>
      )}
    </div>
  );
}
