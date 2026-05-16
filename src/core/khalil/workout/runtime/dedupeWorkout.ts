/**
 * Khalil — Workout insert dedupe classifier (pure, P2.7).
 *
 * Two unique constraints back idempotency:
 *   - (user_id, client_event_id) on sessions
 *   - (user_id, client_event_id) on sets
 *
 * Replay duplicates are translated to a `duplicate` outcome so retries
 * are no-ops.
 */
export type WorkoutDedupeOutcome =
  | "fresh"
  | "replay_duplicate"
  | "constraint_violation";

interface PgErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

const PG_UNIQUE_VIOLATION = "23505";

export function classifyWorkoutInsertError(
  err: PgErrorLike | null | undefined,
): WorkoutDedupeOutcome {
  if (!err) return "fresh";
  if (err.code !== PG_UNIQUE_VIOLATION) return "constraint_violation";
  const blob = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  if (blob.includes("client_event_unique")) return "replay_duplicate";
  return "constraint_violation";
}
