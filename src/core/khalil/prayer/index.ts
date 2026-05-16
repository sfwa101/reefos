/**
 * Khalil — Prayer sub-domain public surface (P2.2).
 *
 * UI imports ONLY from this barrel (and `@/core/khalil`). Internal
 * `runtime/` and gateway internals are intentionally not re-exported
 * (Art. VI — stable contracts).
 */
export { logPrayerFn } from "./gateway/logPrayer";
export { readPrayerTodayFn } from "./gateway/readPrayerToday";
export {
  PRAYER_NAMES,
  PRAYER_MODES,
  type PrayerName,
  type PrayerMode,
  type PrayerLogRow,
  type PrayerDayView,
} from "./schemas";
export { computePrayerDayView } from "./runtime/computePrayerState";
export {
  validatePrayerWindow,
  PRAYER_HOUR_WINDOWS,
  type PrayerWindowError,
} from "./runtime/validatePrayerWindow";
