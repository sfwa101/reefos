/**
 * Khalil — event catalog (names only, P2.1 scaffold).
 *
 * Real emission lives in server fns (gateway) per ADR-0004 / Art. IV.
 * UI never emits events directly. This file is a typo-safe registry; the
 * append-only event log + subscriber wiring lands in P2.2 with the first
 * real capability.
 */
export const KHALIL_EVENT = Object.freeze({
  PRAYER_LOGGED: "khalil.prayer.logged",
  HABIT_DEFINED: "khalil.habit.defined",
  HABIT_ARCHIVED: "khalil.habit.archived",
  HABIT_COMPLETED: "khalil.habit.completed",
  WORKOUT_SESSION_OPENED: "khalil.workout.session_opened",
  WORKOUT_SESSION_CLOSED: "khalil.workout.session_closed",
  WORKOUT_SET_RECORDED: "khalil.workout.set_recorded",
  WEIGHT_RECORDED: "khalil.weight.recorded",
  RECOVERY_CHANGED: "khalil.recovery.changed",
  IDENTITY_EVOLVED: "khalil.identity.evolved",
  COACH_PROPOSED: "khalil.coach.proposed",
  COACH_ACCEPTED: "khalil.coach.accepted",
  COACH_DISMISSED: "khalil.coach.dismissed",
} as const);

export type KhalilEventName = (typeof KHALIL_EVENT)[keyof typeof KHALIL_EVENT];
