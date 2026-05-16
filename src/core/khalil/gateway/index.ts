/**
 * Khalil — public gateway barrel.
 *
 * The ONLY surface UI under `src/apps/khalil/` may import for server I/O.
 * Internal runtime (`src/core/khalil/orchestrator/*`, sub-domain modules)
 * is not exported. Per Art. V + p1-data-ownership.md.
 */
export { composeKhalilHomeFn } from "../orchestrator/composeHome.functions";
export {
  defineHabitFn,
  archiveHabitFn,
  completeHabitFn,
  readHabitsTodayFn,
} from "../habit";
export { logPrayerFn, readPrayerTodayFn } from "../prayer";
