/**
 * Frequency Engine — decides whether a rail tagged with a publishing cadence
 * should appear at the current moment. Pure function, no DB access.
 *
 * Cadence rules:
 *   DAILY_FLASH        → always on (refreshed daily by content team)
 *   SEMI_WEEKLY_FRESH  → only Tuesdays & Saturdays (best produce arrival days)
 *   WEEKLY_BIG         → only Fridays (the big weekly drop)
 *   MONTHLY_PANTRY     → only first 5 days of the calendar month
 *   NONE               → no cadence gate
 */
export type FrequencyTag =
  | "NONE"
  | "DAILY_FLASH"
  | "SEMI_WEEKLY_FRESH"
  | "WEEKLY_BIG"
  | "MONTHLY_PANTRY";

export const isFrequencyActive = (tag: FrequencyTag, now: Date = new Date()): boolean => {
  switch (tag) {
    case "NONE":
    case "DAILY_FLASH":
      return true;
    case "SEMI_WEEKLY_FRESH": {
      const d = now.getDay(); // 0=Sun..6=Sat
      return d === 2 || d === 6;
    }
    case "WEEKLY_BIG":
      return now.getDay() === 5;
    case "MONTHLY_PANTRY":
      return now.getDate() <= 5;
    default:
      return true;
  }
};
