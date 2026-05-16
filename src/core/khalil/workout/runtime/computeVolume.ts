/**
 * Khalil — Workout volume math (pure, P2.7).
 *
 * Volume = Σ reps × weight_kg, excluding sets that were superseded by a
 * later correction row. The "net effective" rule: when a set has been
 * corrected by another row (is_correction = true, corrects_set_id = X),
 * the corrected set X is dropped from the volume tally; the correction
 * row stands in its place.
 */
import type { WorkoutSetRow } from "../schemas";

export function effectiveSets(sets: ReadonlyArray<WorkoutSetRow>): WorkoutSetRow[] {
  const corrected = new Set<string>();
  for (const s of sets) {
    if (s.isCorrection && s.correctsSetId) corrected.add(s.correctsSetId);
  }
  return sets.filter((s) => !corrected.has(s.id));
}

export function computeSessionVolume(sets: ReadonlyArray<WorkoutSetRow>): number {
  return effectiveSets(sets).reduce((acc, s) => acc + s.reps * s.weightKg, 0);
}

export function computeSetsCount(sets: ReadonlyArray<WorkoutSetRow>): number {
  return effectiveSets(sets).length;
}
