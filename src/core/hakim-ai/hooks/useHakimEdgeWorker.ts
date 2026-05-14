import { useEffect, useRef } from "react";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";
import { emitSalsabilEvent } from "@/core/events";

/**
 * useHakimEdgeWorker — local-first autonomous agent.
 *
 * Runs entirely in the browser. Observes:
 *   1) Cart abandonment   — items present + idle > 15 min
 *   2) Sales spike        — wild qty change in cart vs baseline
 *   3) Runtime errors     — unhandled errors / promise rejections
 *   4) Console errors     — monkey-patched console.error
 *
 * Anomalies are POSTed via the `report_anomaly` RPC which deduplicates per
 * fingerprint over a 10-minute window — so a flood of identical errors costs
 * one row, not thousands. ZERO external LLM calls in baseline mode.
 */

type EdgeOptions = {
  /** Optional accessor returning the current cart for abandonment checks. */
  getCart?: () => { items: Array<{ id: string; quantity: number }>; updatedAt?: number } | null;
  /** Disable the agent entirely (e.g. for unauthenticated routes). */
  enabled?: boolean;
};

const ABANDON_MS = 15 * 60 * 1000;
const TICK_MS = 30 * 1000;

const fingerprintFor = (parts: Array<string | number | undefined>) =>
  parts.filter(Boolean).join("|").slice(0, 200);

async function report(
  type: string,
  severity: "info" | "warning" | "error" | "critical",
  description: string,
  payload: Record<string, unknown> = {},
  source = "edge_worker",
  fingerprint?: string,
) {
  await HakimGateway.reportAnomaly({
    type,
    severity,
    description,
    payload,
    source,
    fingerprint: fingerprint ?? null,
  });
}

let globalPatched = false;

const patchGlobals = () => {
  if (globalPatched || typeof window === "undefined") return;
  globalPatched = true;

  // Console.error monkey-patch
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      const text = args
        .map((a) => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ")
        .slice(0, 500);

      // Skip noisy hydration warnings — TanStack handles these gracefully
      if (
        text.includes("hydration") ||
        text.includes("Hydration") ||
        text.includes("fetchpriority") ||
        text.includes("Warning: validateDOMNesting")
      ) {
        // still log locally, just don't escalate
      } else {
        report(
          "console_error",
          "error",
          text,
          { source: "console.error", route: window.location.pathname },
          "console",
          fingerprintFor(["console", text.slice(0, 80)]),
        );
      }
    } catch {
      /* never throw */
    }
    originalError(...args);
  };

  // Unhandled errors
  window.addEventListener("error", (ev) => {
    const msg = ev.message || "Unknown error";
    report(
      "runtime_error",
      "error",
      msg,
      {
        filename: (ev as ErrorEvent).filename,
        lineno: (ev as ErrorEvent).lineno,
        route: window.location.pathname,
      },
      "window.error",
      fingerprintFor(["runtime", msg.slice(0, 80)]),
    );
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (ev) => {
    const reason: unknown = (ev as PromiseRejectionEvent).reason;
    const msg =
      reason instanceof Error ? reason.message : String(reason ?? "rejection");
    report(
      "promise_rejection",
      "error",
      msg,
      { route: window.location.pathname },
      "unhandledrejection",
      fingerprintFor(["rejection", msg.slice(0, 80)]),
    );
  });
};

export const useHakimEdgeWorker = ({ getCart, enabled = true }: EdgeOptions = {}) => {
  const lastCartSizeRef = useRef<number>(0);
  const lastReportedAbandonRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    // Skip console monkey-patch in dev to avoid HMR echo storms.
    if (!import.meta.env.DEV) patchGlobals();

    const tick = () => {
      try {
        // 1) Cart abandonment
        const cart = getCart?.();
        if (cart && cart.items.length > 0 && cart.updatedAt) {
          const idleMs = Date.now() - cart.updatedAt;
          if (
            idleMs > ABANDON_MS &&
            Date.now() - lastReportedAbandonRef.current > ABANDON_MS
          ) {
            lastReportedAbandonRef.current = Date.now();
            const totalQty = cart.items.reduce((s, i) => s + (i.quantity || 0), 0);
            // Push to Salsabil Event Bus (Phase VII-A) — Hakim & analytics subscribe
            emitSalsabilEvent("cart.abandoned", {
              items: cart.items.length,
              totalQuantity: totalQty,
              idleMinutes: Math.round(idleMs / 60000),
            });
            report(
              "cart_abandonment",
              "warning",
              `سلة مهملة منذ ${Math.round(idleMs / 60000)} دقيقة`,
              {
                items: cart.items.length,
                total_quantity: totalQty,
                idle_minutes: Math.round(idleMs / 60000),
              },
              "edge_worker",
              fingerprintFor(["cart_abandonment", cart.items.length]),
            );
          }
        }

        // 2) Sales spike: cart quantity grew >5x between ticks
        const currentSize =
          cart?.items.reduce((s, i) => s + (i.quantity || 0), 0) ?? 0;
        if (
          lastCartSizeRef.current > 2 &&
          currentSize > lastCartSizeRef.current * 5
        ) {
          report(
            "sales_spike",
            "info",
            `قفزة في كمية السلة من ${lastCartSizeRef.current} إلى ${currentSize}`,
            { previous: lastCartSizeRef.current, current: currentSize },
            "edge_worker",
            fingerprintFor(["sales_spike", currentSize]),
          );
        }
        lastCartSizeRef.current = currentSize;
      } catch {
        /* keep agent alive */
      }
    };

    const interval = window.setInterval(tick, TICK_MS);
    // also run shortly after mount to catch obvious states
    const warmup = window.setTimeout(tick, 5000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(warmup);
    };
  }, [enabled, getCart]);
};
