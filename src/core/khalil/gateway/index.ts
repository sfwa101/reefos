/**
 * Khalil — public gateway barrel.
 *
 * The ONLY surface UI under `src/apps/khalil/` may import for server I/O.
 */
export { composeKhalilHomeFn } from "../orchestrator/composeHome.functions";
export {
  defineHabitFn,
  archiveHabitFn,
  completeHabitFn,
  readHabitsTodayFn,
} from "../habit";
export { logPrayerFn, readPrayerTodayFn } from "../prayer";
export { toggleRecoveryFn, readRecoveryStateFn } from "../recovery";
export { readIdentityFn, recomputeIdentityFn } from "../identity";
export {
  proposeCoachFn,
  acceptCoachFn,
  dismissCoachFn,
  readCoachHistoryFn,
} from "../coach";
export {
  startWorkoutSessionFn,
  addWorkoutSetFn,
  closeWorkoutSessionFn,
  readWorkoutCurrentFn,
  readWorkoutHistoryFn,
} from "../workout";
export { writeWeightMeasurementFn, readWeightTrendFn } from "../weight";
export {
  readAdherenceFn,
  readHeatmapFn,
  readWeightDeltaFn,
  readWorkoutVolumeFn,
  type AnalyticsWindow,
  type AdherenceReadDTO,
  type AdherenceDayDTO,
  type HeatmapReadDTO,
  type HeatmapCellDTO,
  type WorkoutVolumeReadDTO,
  type WorkoutVolumeWeekDTO,
  type WeightDeltaDTO,
} from "../analytics/readAnalytics";
export {
  readIntelligenceSnapshotFn,
  recomputeIntelligenceSnapshotFn,
} from "../intelligence";
