import { Component, type ReactNode } from "react";
import { Tracer } from "@/core/system/observability/Tracer";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Phase T — Global hydration / provider-tree error boundary.
 *
 * Catches synchronous render errors and lifecycle errors from anywhere
 * inside the provider tree (Theme, Locale, Auth, Cart, Location, etc.).
 * Prevents the silent "static HTML shell" symptom when a provider's
 * initial useEffect throws and React tears down the whole subtree.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    Tracer.error("system", "globalerrorboundary", { args: ["[GlobalErrorBoundary]", error, info] });
  }

  private handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-background px-4"
      >
        <div className="max-w-md text-center">
          <h1 className="font-display text-5xl font-extrabold text-destructive">
            !
          </h1>
          <h2 className="mt-4 font-display text-xl font-bold text-foreground">
            خطأ في التطبيق
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            حدث خطأ غير متوقع أثناء تحميل الواجهة. اضغط لإعادة المحاولة.
          </p>
          <Button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-pill transition hover:opacity-90"
          >
            إعادة تحميل التطبيق
          </Button>
          {import.meta.env.DEV && (
            <pre className="mt-6 max-h-48 overflow-auto rounded-md bg-muted p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
