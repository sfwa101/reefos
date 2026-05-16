/**
 * Khalil — Habit completion dedupe (pure).
 *
 * Two unique constraints back the append-only law:
 *   - (user_id, habit_id, date)            → semantic dedupe
 *   - client_event_id                      → replay dedupe
 *
 * Classifier translates a 23505 error into an idempotent outcome so the
 * gateway can no-op duplicate replays rather than surfacing an error.
 */
export type HabitDedupeOutcome =
  | "fresh"
  | "semantic_duplicate"
  | "replay_duplicate";

interface PgErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

const PG_UNIQUE_VIOLATION = "23505";

export function classifyHabitInsertError(
  err: PgErrorLike | null | undefined,
): HabitDedupeOutcome {
  if (!err || err.code !== PG_UNIQUE_VIOLATION) return "fresh";
  const blob = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  if (blob.includes("khalil_habit_completion_client_event_unique"))
    return "replay_duplicate";
  return "semantic_duplicate";
}
