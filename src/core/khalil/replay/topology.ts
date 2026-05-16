/**
 * Replay topology — declarative inventory of every projection that can
 * be rebuilt from append-only events. Server-only consumers reference
 * the descriptors by key; the actual server functions live in
 * `src/core/khalil/analytics/replay*.ts` and are wired through the
 * gateway barrel to preserve the "no direct supabase in UI" rule.
 */
export const KHALIL_PROJECTION_REPLAY = {
  adherence: {
    key: "adherence",
    sourceEventTable: "khalil_habit_completion",
    projectionTable: "khalil_adherence_daily",
    gatewayFn: "replayHabitProjectionFn",
    ordering: "by_date_asc",
  },
  streaks: {
    key: "streaks",
    sourceEventTable: "khalil_habit_completion",
    projectionTable: "khalil_streak_state",
    gatewayFn: "replayHabitProjectionFn",
    ordering: "by_date_asc",
  },
  identity: {
    key: "identity",
    sourceEventTable: "khalil_adherence_daily",
    projectionTable: "khalil_identity_state",
    gatewayFn: "recomputeIdentityFn",
    ordering: "by_window_then_date",
  },
  recovery: {
    key: "recovery",
    sourceEventTable: "khalil_recovery_event",
    projectionTable: "khalil_recovery_state",
    gatewayFn: "readRecoveryStateFn",
    ordering: "by_event_id_asc",
  },
  prayer: {
    key: "prayer",
    sourceEventTable: "khalil_prayer_log",
    projectionTable: "khalil_prayer_daily",
    gatewayFn: "replayPrayerProjectionFn",
    ordering: "by_date_then_slot",
  },
  workoutVolume: {
    key: "workoutVolume",
    sourceEventTable: "khalil_workout_set",
    projectionTable: "khalil_workout_volume_daily",
    gatewayFn: "replayWorkoutProjectionFn",
    ordering: "by_session_then_set",
  },
  weightTrend: {
    key: "weightTrend",
    sourceEventTable: "khalil_weight_measurement",
    projectionTable: "khalil_weight_projection",
    gatewayFn: "replayWeightProjectionFn",
    ordering: "by_date_asc",
  },
} as const;

export type KhalilProjectionKey = keyof typeof KHALIL_PROJECTION_REPLAY;
export type ReplayDescriptor =
  (typeof KHALIL_PROJECTION_REPLAY)[KhalilProjectionKey];
