/**
 * Khalil — Prayer dedupe runtime (P2.2).
 *
 * Append-only log + offline replay = the same prayer can be submitted
 * twice. Dedupe is enforced server-side by two unique constraints:
 *
 *   - (user_id, logged_for_date, prayer, mode)  — semantic dedupe
 *   - client_event_id                           — replay dedupe
 *
 * This module provides the client-side classifier so the gateway can
 * translate a 23505 violation into an idempotent success rather than a
 * surfaced error (offline contract: "duplicate replay must no-op").
 */
export type DedupeOutcome = "fresh" | "semantic_duplicate" | "replay_duplicate";

interface PgErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

const PG_UNIQUE_VIOLATION = "23505";

export function classifyPrayerInsertError(err: PgErrorLike | null | undefined): DedupeOutcome {
  if (!err || err.code !== PG_UNIQUE_VIOLATION) return "fresh";
  const blob = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  if (blob.includes("khalil_prayer_log_client_event_unique")) return "replay_duplicate";
  return "semantic_duplicate";
}
