/**
 * SDUIErrorBoundary — Phase 40 Fault Isolation.
 *
 * A render-time error in any single SDUI / LayoutFactory block must NEVER
 * tear down the React tree. This boundary catches the error, logs it
 * silently (and to the sovereign tracing channel when available), and
 * falls back to a neutral empty `<div>` so the rest of the page survives.
 */
import { Component, type ReactNode } from "react";
import { Tracer } from "@/core/system/observability/Tracer";

type Props = {
  /** Identifies the failing block in logs (e.g. block.id or section key). */
  blockId?: string;
  /** Optional human-readable kind ("sdui_block", "layout_section"). */
  blockKind?: string;
  children: ReactNode;
};

type State = { hasError: boolean };

export class SDUIErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: unknown) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      Tracer.error("runtime-ui", "log", { args: [`[SDUIErrorBoundary] ${this.props.blockKind ?? "block"}` +
                  `${this.props.blockId ? ` "${this.props.blockId}"` : ""} crashed`, error, info] });
    }
    // Best-effort sovereign tracing — never throw from a boundary.
    try {
      void import("@/core/system/observability/SovereignTracingGateway").then(
        ({ createTraceId, logSovereignEvent }) =>
          logSovereignEvent({
            trace_id: createTraceId(),
            event_domain: "sdui_runtime",
            event_type: "block_render_failed",
            payload: {
              block_id: this.props.blockId ?? null,
              block_kind: this.props.blockKind ?? null,
              message: error.message,
            },
          }),
      );
    } catch {
      /* swallow — boundary must not throw */
    }
    // Phase 46 — feed the autonomous Watchdog (sliding-window circuit breaker).
    try {
      void import("../engine/SduiWatchdog").then(({ recordSduiFailure }) =>
        recordSduiFailure(this.props.blockId ?? null),
      );
    } catch {
      /* never throw from a boundary */
    }
  }

  render() {
    if (this.state.hasError) {
      // Empty placeholder keeps surrounding spacing/grid intact without
      // leaking implementation details to the user.
      return <div data-sdui-fallback="true" aria-hidden="true" />;
    }
    return this.props.children;
  }
}
