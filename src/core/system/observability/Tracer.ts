/**
 * Tracer — Sovereign Observability Façade.
 *
 * Single Source of Truth for runtime instrumentation. Wraps
 * `logSovereignEvent` with a uniform `info/warn/error` API so that
 * call-sites no longer reach for `console.*`.
 *
 * Contract:
 *  - Fire-and-forget. Never throws. Never blocks.
 *  - Auto-generates a `trace_id` if the caller does not provide one.
 *  - In `import.meta.env.DEV`, mirrors output to the browser console
 *    so engineers retain local visibility.
 */
import { createTraceId, logSovereignEvent } from "./SovereignTracingGateway";

type Level = "info" | "warn" | "error";

export type TracerContext = {
  trace_id?: string;
  payload?: Record<string, unknown>;
};

const isDev = (() => {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } })?.env?.DEV);
  } catch {
    return false;
  }
})();

const normalizeError = (err: unknown): Record<string, unknown> => {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  if (err && typeof err === "object") return err as Record<string, unknown>;
  return { value: String(err) };
};

const emit = (
  level: Level,
  domain: string,
  type: string,
  ctx?: TracerContext | Record<string, unknown> | unknown,
): string => {
  let trace_id: string;
  let payload: Record<string, unknown> = {};

  if (ctx && typeof ctx === "object") {
    const maybe = ctx as TracerContext;
    if (typeof maybe.trace_id === "string" || maybe.payload) {
      trace_id = maybe.trace_id ?? createTraceId();
      payload = { ...(maybe.payload ?? {}) };
    } else if (level === "error") {
      trace_id = createTraceId();
      payload = normalizeError(ctx);
    } else {
      trace_id = createTraceId();
      payload = ctx as Record<string, unknown>;
    }
  } else {
    trace_id = createTraceId();
    if (ctx !== undefined) payload = { value: ctx };
  }

  payload._level = level;

  if (isDev) {
    const tag = `[Tracer:${level}] ${domain}/${type}`;
    if (level === "error") console.error(tag, payload);
    else if (level === "warn") console.warn(tag, payload);
    else console.info(tag, payload);
  }

  void logSovereignEvent({ trace_id, event_domain: domain, event_type: type, payload });
  return trace_id;
};

export const Tracer = {
  info: (domain: string, type: string, ctx?: TracerContext | Record<string, unknown>) =>
    emit("info", domain, type, ctx),
  warn: (domain: string, type: string, ctx?: TracerContext | Record<string, unknown>) =>
    emit("warn", domain, type, ctx),
  error: (domain: string, type: string, ctx?: TracerContext | Record<string, unknown> | unknown) =>
    emit("error", domain, type, ctx),
};

export type { Level as TracerLevel };
