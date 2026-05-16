/**
 * Khalil — Workout projection subscriber (P2.7).
 *
 * Application-bus subscriber stub: persistence is owned by DB triggers
 * (`khalil_workout_project_weekly` / `khalil_workout_session_project_count`)
 * so this subscriber is responsible only for observability and idempotent
 * derived-projection refresh hooks in future phases. Idempotent on `event.id`.
 */
import type { KhalilWorkoutEventEnvelope } from "../workout/events";

const seen = new Set<string>();

export function handleWorkoutEvent(env: KhalilWorkoutEventEnvelope): void {
  if (seen.has(env.id)) return;
  seen.add(env.id);
  // No-op: real persistence handled by DB triggers (Art. IV §B).
}

/** Test-only reset. */
export function __resetWorkoutSubscriberForTests() {
  seen.clear();
}
