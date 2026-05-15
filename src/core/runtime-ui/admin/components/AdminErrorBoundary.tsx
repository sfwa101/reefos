/**
 * AdminErrorBoundary — Pastel Soul critical error UI for the SDUI tree.
 *
 * Catches any render-time crash inside the admin engine and offers a
 * one-click "Rollback to Previous Version" fallback wired into
 * `useSchemaRollback`. Prevents the white screen of death.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchemaRollback } from "../hooks/useSchemaRollback";
import { Tracer } from "@/core/system/observability/Tracer";

interface Props {
  children: ReactNode;
  /** Entity definition id — required for rollback button to appear. */
  entityId?: string;
  /** Schema mode that crashed (form | edit | create | list). */
  mode?: string;
  /** Optional reset callback. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

function RollbackPanel({
  entityId, mode, error, onReset,
}: { entityId?: string; mode: string; error: Error; onReset?: () => void }) {
  const rollback = useSchemaRollback(entityId, mode);
  return (
    <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-destructive/40 p-8 shadow-soft space-y-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-2xl bg-destructive/10 grid place-items-center shrink-0">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <div className="space-y-1 min-w-0">
          <h2 className="font-display text-xl">انهيار في واجهة المسؤول</h2>
          <p className="text-[13px] text-foreground/60">
            التقطنا الخطأ قبل أن يصل إلى الشاشة. يمكنك الرجوع إلى آخر إصدار مستقر.
          </p>
        </div>
      </div>

      <pre className="rounded-2xl bg-muted/40 p-4 text-[11px] text-foreground/70 overflow-auto max-h-40 font-mono">
        {error.message}
      </pre>

      <div className="flex flex-wrap gap-3 justify-end">
        {onReset && (
          <Button variant="ghost" onClick={onReset} className="rounded-2xl">
            إعادة المحاولة
          </Button>
        )}
        {entityId && (
          <Button
            variant="destructive"
            disabled={rollback.isPending}
            onClick={() => rollback.mutate(undefined, { onSuccess: onReset })}
            className="rounded-2xl gap-2"
          >
            <RotateCcw className="size-4" />
            {rollback.isPending ? "جارٍ التراجع…" : "الرجوع للإصدار السابق"}
          </Button>
        )}
      </div>
    </div>
  );
}

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      Tracer.error("runtime-ui", "adminerrorboundary", { args: ["[AdminErrorBoundary]", error, info.componentStack] });
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <RollbackPanel
            entityId={this.props.entityId}
            mode={this.props.mode ?? "form"}
            error={this.state.error}
            onReset={this.handleReset}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
