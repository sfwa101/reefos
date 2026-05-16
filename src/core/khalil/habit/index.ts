/**
 * Khalil — Habit sub-domain public surface (P2.3).
 *
 * UI imports ONLY from this barrel (and `@/core/khalil`). Internal
 * `runtime/` and gateway internals are intentionally not re-exported
 * beyond the function entrypoints (Art. VI).
 */
export { defineHabitFn, archiveHabitFn } from "./gateway/defineHabit";
export { completeHabitFn } from "./gateway/completeHabit";
export { readHabitsTodayFn } from "./gateway/readHabitsToday";
export {
  HABIT_CADENCES,
  HABIT_COMPLETION_MODES,
  type HabitCadence,
  type HabitCompletionMode,
  type HabitDefinitionRow,
  type HabitCompletionRow,
  type HabitTodayView,
} from "./schemas";
export { computeHabitDayView } from "./runtime/computeHabitDayView";
export { validateDefineHabit } from "./runtime/validateDefineHabit";
export { validateCompleteHabit } from "./runtime/validateCompleteHabit";
