/**
 * Khalil — Habit completion validation (pure).
 *
 * Rules:
 *   - partial ∈ (0, 1]
 *   - same-day always allowed
 *   - yesterday allowed only when recovery mode ≠ "off"
 *   - older / future dates rejected
 *
 * Recovery mode is provided as a stub field by the caller; the real
 * recovery resolver lands with the Recovery pillar (later phase).
 */
import type { CompleteHabitInput } from "../schemas";

export type CompleteHabitReason =
  | "invalid_partial"
  | "future_date"
  | "stale_date"
  | "recovery_required";

export type CompleteHabitVerdict =
  | { ok: true }
  | { ok: false; reason: CompleteHabitReason };

function diffDays(aIso: string, bIso: string): number {
  const a = Date.parse(`${aIso}T00:00:00Z`);
  const b = Date.parse(`${bIso}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

export function validateCompleteHabit(input: CompleteHabitInput): CompleteHabitVerdict {
  if (!(input.partial > 0) || input.partial > 1) {
    return { ok: false, reason: "invalid_partial" };
  }
  const delta = diffDays(input.date, input.todayLocalDate);
  if (delta > 0) return { ok: false, reason: "future_date" };
  if (delta === 0) return { ok: true };
  if (delta === -1) {
    return input.recoveryMode === "off"
      ? { ok: false, reason: "recovery_required" }
      : { ok: true };
  }
  return { ok: false, reason: "stale_date" };
}
