/**
 * Khalil — Recovery state resolver (pure).
 *
 * Replays an ordered sequence of recovery events to reconstruct the
 * current state. Mirrors the SQL projection (`khalil_recompute_recovery_state`)
 * so unit tests can lock the invariant on the JS side.
 *
 * Events MUST be sorted ascending by `createdAt`. Invalid transitions in
 * the history are skipped (defensive — should never happen because the
 * gateway gates inserts via `validateRecoveryTransition`).
 */
import type { RecoveryEventRow, RecoveryMode } from "../schemas";
import { validateRecoveryTransition } from "./validateRecoveryTransition";

export interface ResolvedRecoveryState {
  currentState: RecoveryMode;
  enteredAt: string;
  appliedCount: number;
}

export function resolveRecoveryState(
  events: ReadonlyArray<RecoveryEventRow>,
  fallback: { state: RecoveryMode; at: string } = {
    state: "off",
    at: new Date(0).toISOString(),
  },
): ResolvedRecoveryState {
  let state: RecoveryMode = fallback.state;
  let enteredAt = fallback.at;
  let applied = 0;
  for (const ev of events) {
    const verdict = validateRecoveryTransition({
      from: state,
      to: ev.toState,
      reason: ev.reason,
    });
    if (!verdict.ok) continue;
    state = ev.toState;
    enteredAt = ev.createdAt;
    applied += 1;
  }
  return { currentState: state, enteredAt, appliedCount: applied };
}

/** True when adherence math should soften denominators for this mode. */
export function isRecoverySoftened(mode: RecoveryMode): boolean {
  return mode !== "off";
}
