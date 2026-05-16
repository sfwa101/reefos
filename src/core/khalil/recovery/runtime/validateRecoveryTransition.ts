/**
 * Khalil — Recovery transition state machine (pure).
 *
 * Allowed transitions (Art. IV, P2.4 §4):
 *   off  ↔ soft
 *   soft ↔ hard
 *   off  ✗ hard   (no direct jump — must pass through soft)
 *
 * Additional rules:
 *   - duplicate transitions (from === to) are rejected
 *   - entering `hard` requires a reason
 *
 * Pure TS — no I/O, no React. The gateway calls this before any insert.
 */
import type { RecoveryMode } from "../schemas";

export type RecoveryTransitionReason =
  | "same_state"
  | "illegal_transition"
  | "reason_required";

export type RecoveryTransitionVerdict =
  | { ok: true }
  | { ok: false; reason: RecoveryTransitionReason };

const ALLOWED: ReadonlySet<string> = new Set([
  "off->soft",
  "soft->off",
  "soft->hard",
  "hard->soft",
]);

export function validateRecoveryTransition(params: {
  from: RecoveryMode;
  to: RecoveryMode;
  reason?: string | null;
}): RecoveryTransitionVerdict {
  if (params.from === params.to) {
    return { ok: false, reason: "same_state" };
  }
  if (!ALLOWED.has(`${params.from}->${params.to}`)) {
    return { ok: false, reason: "illegal_transition" };
  }
  if (params.to === "hard" && !(params.reason && params.reason.trim().length >= 3)) {
    return { ok: false, reason: "reason_required" };
  }
  return { ok: true };
}
