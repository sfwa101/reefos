/**
 * Salsabil OS — Phase 1 · Wave 7
 * Layer 6 (UI) · POSErrorBoundary.
 *
 * Sovereign error boundary for POS surfaces. Catches render and runtime
 * failures so a single panel crash does not blank the cashier station.
 * Provider-agnostic copy — never leaks framework or vendor names.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Tracer } from "@/core/system/observability/Tracer";

interface Props {
  readonly children: ReactNode;
  readonly fallbackTitle?: string;
}
interface State {
  readonly error: Error | null;
}

export class POSErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    Tracer.error("pos", "poserrorboundary", { args: ["[POSErrorBoundary]", error, info.componentStack] });
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center text-center gap-3"
        role="alert"
        dir="rtl"
      >
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="font-display text-[18px]">
          {this.props.fallbackTitle ?? "حدث خلل غير متوقع في هذه الواجهة"}
        </h3>
        <p className="text-[12px] text-muted-foreground max-w-sm">
          نظام نقطة البيع لا يزال يعمل. يمكنك إعادة تحميل هذه اللوحة دون
          فقدان حالة الورديّة أو السلة.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold press"
        >
          <RefreshCcw className="h-4 w-4" /> إعادة المحاولة
        </button>
      </div>
    );
  }
}
