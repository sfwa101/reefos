/**
 * Khalil — Workout sub-domain barrel (P2.7).
 *
 * UI imports ONLY from this barrel (and `@/core/khalil`).
 */
export { startWorkoutSessionFn } from "./gateway/startSession";
export { addWorkoutSetFn } from "./gateway/addSet";
export { closeWorkoutSessionFn } from "./gateway/closeSession";
export { readWorkoutCurrentFn, readWorkoutHistoryFn } from "./gateway/readWorkout";
export {
  STALE_SESSION_MS,
  type WorkoutSessionRow,
  type WorkoutSetRow,
  type WorkoutCurrentDTO,
  type WorkoutHistoryItemDTO,
  type StartSessionInput,
  type AddSetInput,
  type CloseSessionInput,
} from "./schemas";
export { computeSessionVolume, effectiveSets } from "./runtime/computeVolume";
export { isSessionStale } from "./runtime/staleSession";
export { validateAddSet } from "./runtime/validateAddSet";
