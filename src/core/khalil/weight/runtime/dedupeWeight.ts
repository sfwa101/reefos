/**
 * Khalil — Weight insert dedupe classifier (pure, P2.7).
 *
 * Two unique constraints:
 *   - (user_id, for_date)            → semantic dedupe (one/day)
 *   - (user_id, client_event_id)     → replay dedupe
 */
export type WeightDedupeOutcome =
  | "fresh"
  | "semantic_duplicate"
  | "replay_duplicate";

interface PgErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

const PG_UNIQUE_VIOLATION = "23505";

export function classifyWeightInsertError(
  err: PgErrorLike | null | undefined,
): WeightDedupeOutcome {
  if (!err || err.code !== PG_UNIQUE_VIOLATION) return "fresh";
  const blob = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  if (blob.includes("client_event_unique")) return "replay_duplicate";
  return "semantic_duplicate";
}
