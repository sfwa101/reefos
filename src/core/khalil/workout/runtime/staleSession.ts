/**
 * Khalil — Workout stale-session resolver (pure, P2.7).
 *
 * A session is "stale" when it remains open >24h since `started_at`.
 * Auto-close logic is invoked by the gateway BEFORE returning the
 * current session; replay uses the same predicate to deterministically
 * reconstruct projections.
 */
import { STALE_SESSION_MS } from "../schemas";

export function isSessionStale(
  startedAtIso: string,
  nowMs: number,
): boolean {
  const started = Date.parse(startedAtIso);
  if (!Number.isFinite(started)) return false;
  return nowMs - started > STALE_SESSION_MS;
}
