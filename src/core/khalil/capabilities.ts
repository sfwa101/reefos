/**
 * Khalil — MVP capability key constants (typo-safe).
 *
 * Source of truth = `capability_registry` table (server-side, RLS-checked).
 * These constants only prevent typos in TS call-sites. Adding a key here
 * does NOT grant it — registration + role-bundle migration is required
 * (see `.salsabil/playbooks/01-add-capability.md`).
 *
 * Locked by ADR-0004 / p1-capability-ownership.md.
 */
export const KHALIL_CAP = Object.freeze({
  AUTH_SESSION_READ: "khalil.auth.session.read",

  HOME_COMPOSE_READ: "khalil.home.compose.read",

  PRAYER_LOG_WRITE: "khalil.prayer.log.write",
  PRAYER_LOG_READ: "khalil.prayer.log.read",
  PRAYER_QADAA_WRITE: "khalil.prayer.qadaa.write",
  PRAYER_READ: "khalil.prayer.read",

  HABIT_DEFINE_WRITE: "khalil.habit.define.write",
  HABIT_ARCHIVE_WRITE: "khalil.habit.archive.write",
  HABIT_COMPLETE_WRITE: "khalil.habit.complete.write",
  HABIT_READ: "khalil.habit.read",

  WORKOUT_SESSION_WRITE: "khalil.workout.session.write",
  WORKOUT_SET_WRITE: "khalil.workout.set.write",
  WORKOUT_READ: "khalil.workout.read",

  WEIGHT_MEASUREMENT_WRITE: "khalil.weight.measurement.write",
  WEIGHT_READ: "khalil.weight.read",

  RECOVERY_TOGGLE: "khalil.recovery.toggle",
  RECOVERY_READ: "khalil.recovery.read",

  IDENTITY_READ: "khalil.identity.read",
  IDENTITY_RECOMPUTE: "khalil.identity.recompute",

  ANALYTICS_PRIVATE_READ: "khalil.analytics.private.read",

  COACH_PROPOSE_READ: "khalil.coach.propose.read",
  COACH_ACCEPT: "khalil.coach.accept",
  COACH_DISMISS: "khalil.coach.dismiss",
} as const);

export type KhalilCapabilityKey = (typeof KHALIL_CAP)[keyof typeof KHALIL_CAP];
