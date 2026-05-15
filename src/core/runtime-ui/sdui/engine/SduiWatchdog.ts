/**
 * SduiWatchdog — Phase 46 Autonomous Governance.
 *
 * Subscribes to a sliding window of `sdui_runtime.block_render_failed`
 * events and trips the AI orchestration circuit breaker via the
 * `admin_trigger_circuit_breaker` SECURITY DEFINER RPC when the rate
 * exceeds the configured threshold.
 *
 * Cool-down: 15 minutes between trips to prevent infinite loops.
 * Threshold: 5 failures within 60 seconds.
 *
 * Singleton — initialized once from the OS root via `initSduiWatchdog()`.
 */
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";
import { createTraceId, logSovereignEvent } from "@/core/system/observability/SovereignTracingGateway";
import { Tracer } from "@/core/system/observability/Tracer";

const WINDOW_MS = 60_000;
const THRESHOLD = 5;
const COOLDOWN_MS = 15 * 60_000;
const TRIP_KEY = "ai_orchestration_enabled";

let failures: number[] = [];
let lastTripAt = 0;
let installed = false;

export function recordSduiFailure(blockId?: string | null): void {
  const now = Date.now();
  failures.push(now);
  // prune outside window
  failures = failures.filter((t) => now - t <= WINDOW_MS);

  if (failures.length < THRESHOLD) return;
  if (now - lastTripAt < COOLDOWN_MS) return;

  lastTripAt = now;
  const reason = `SDUI failure burst: ${failures.length} block_render_failed in ${WINDOW_MS / 1000}s (last: ${blockId ?? "unknown"})`;
  failures = [];

  void tripCircuitBreaker(TRIP_KEY, reason);
}

async function tripCircuitBreaker(key: string, reason: string): Promise<void> {
  try {
    const { error } = await RuntimeUIGateway.tripCircuitBreaker(key, reason);
    if (error) {
      // Most clients (non-admin) will be denied — that's expected.
      // Only the first admin tab present will succeed; others fail safely.
      Tracer.warn("runtime-ui", "sduiwatchdog_trip_rpc_denied_failed", { args: ["[SduiWatchdog] trip RPC denied/failed:", error.message] });
      return;
    }
    await logSovereignEvent({
      trace_id: createTraceId(),
      event_domain: "system",
      event_type: "circuit_breaker_client_trip",
      payload: { key, reason },
    });
  } catch (e) {
    Tracer.warn("runtime-ui", "sduiwatchdog_trip_threw", { args: ["[SduiWatchdog] trip threw", e] });
  }
}

/** Mount once near the OS root. Idempotent. */
export function initSduiWatchdog(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Currently fed directly via recordSduiFailure() from SDUIErrorBoundary.
  // Reserved for future broadcast-channel cross-tab aggregation.
}

export const __watchdogInternals = {
  reset() {
    failures = [];
    lastTripAt = 0;
  },
  state() {
    return { failures: failures.length, lastTripAt };
  },
};
