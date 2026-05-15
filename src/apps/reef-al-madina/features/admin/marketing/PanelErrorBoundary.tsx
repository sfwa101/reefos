import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Tracer } from "@/core/system/observability/Tracer";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Tracer.error("admin", "panelerrorboundary", { args: ["[PanelErrorBoundary]", this.props.label ?? "panel", error, info] });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="bg-surface rounded-3xl border border-destructive/30 shadow-soft p-8 text-center" dir="rtl">
        <div className="h-12 w-12 mx-auto mb-3 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="font-display text-[16px] mb-1">تعذّر تحميل هذا التبويب</p>
        <p className="text-[12.5px] text-foreground-tertiary mb-4 line-clamp-2">
          {this.state.error.message || "حدث خطأ غير متوقع"}
        </p>
        <Button
          onClick={this.reset}
          className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-[13px] font-semibold press inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> إعادة المحاولة
        </Button>
      </div>
    );
  }
}

export default PanelErrorBoundary;
