/**
 * Khalil — Workout addSet validation (pure, P2.7).
 *
 * Server-side cross-field checks that complement zod's shape validation:
 *   - corrections MUST target a real set id (zod ensures the field exists)
 *   - reps × weight_kg must remain finite & non-negative
 *   - rpe must remain in [1,10] when present
 */
import type { AddSetInput } from "../schemas";

export type AddSetReason =
  | "invalid_correction"
  | "invalid_volume"
  | "invalid_rpe";

export type AddSetVerdict =
  | { ok: true }
  | { ok: false; reason: AddSetReason };

export function validateAddSet(input: AddSetInput): AddSetVerdict {
  if (input.isCorrection && !input.correctsSetId) {
    return { ok: false, reason: "invalid_correction" };
  }
  if (!input.isCorrection && input.correctsSetId) {
    return { ok: false, reason: "invalid_correction" };
  }
  const volume = input.reps * input.weightKg;
  if (!Number.isFinite(volume) || volume < 0) {
    return { ok: false, reason: "invalid_volume" };
  }
  if (input.rpe !== undefined && (input.rpe < 1 || input.rpe > 10)) {
    return { ok: false, reason: "invalid_rpe" };
  }
  return { ok: true };
}
