/**
 * Sovereign Tracing — Phase 38 Titanium Shield Part 3.
 *
 * Lightweight client wrapper around the `log_sovereign_event` RPC.
 * - `createTraceId()`         → UUID v4, used to correlate multi-step flows.
 * - `logSovereignEvent(...)`  → fire-and-forget append into the immutable
 *                               `salsabil_event_timeline`. Never throws —
 *                               failures are logged to console only so
 *                               instrumentation can never break a flow.
 */
import { supabase } from "@/integrations/supabase/client";

export const createTraceId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export type SovereignEventInput = {
  trace_id: string;
  event_domain: string;
  event_type: string;
  payload?: Record<string, unknown>;
};

export const logSovereignEvent = async (e: SovereignEventInput): Promise<void> => {
  try {
    const { error } = await supabase.rpc("log_sovereign_event", {
      p_trace_id: e.trace_id,
      p_event_domain: e.event_domain,
      p_event_type: e.event_type,
      p_payload: (e.payload ?? {}) as never,
    });
    if (error) console.warn("[sovereign-tracing] append failed", error.message);
  } catch (err) {
    console.warn("[sovereign-tracing] append threw", err);
  }
};
