/**
 * Khalil — Prayer schemas (P2.2).
 *
 * Wire-level + runtime contracts for the Prayer pillar. Lives at the
 * domain edge (gateway + runtime + UI) so the shape is single-sourced.
 *
 * Locked by p1-data-ownership.md / p1-event-flows.md / ADR-0004.
 */
import { z } from "zod";

export const PRAYER_NAMES = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];

export const PRAYER_MODES = ["on_time", "qadaa"] as const;
export type PrayerMode = (typeof PRAYER_MODES)[number];

export const prayerNameSchema = z.enum(PRAYER_NAMES);
export const prayerModeSchema = z.enum(PRAYER_MODES);

/** ISO date `YYYY-MM-DD` in the user's local timezone. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** Stable client-side idempotency key (uuid v4 recommended). */
export const clientEventIdSchema = z.string().min(8).max(64);

/** Write contract for logging a single prayer. */
export const logPrayerInputSchema = z.object({
  prayer: prayerNameSchema,
  mode: prayerModeSchema,
  loggedForDate: isoDateSchema,
  /** Local clock when the user pressed the button, ms since epoch. */
  occurredAtClientMs: z.number().int().positive(),
  /** Local hour [0..23] when the user pressed the button. */
  occurredAtClientHour: z.number().int().min(0).max(23),
  clientEventId: clientEventIdSchema,
});
export type LogPrayerInput = z.infer<typeof logPrayerInputSchema>;

/** Read contract — caller passes the date they're viewing. */
export const readPrayerTodayInputSchema = z.object({
  date: isoDateSchema,
});
export type ReadPrayerTodayInput = z.infer<typeof readPrayerTodayInputSchema>;

/** Row projection returned to UI. */
export interface PrayerLogRow {
  id: string;
  prayer: PrayerName;
  mode: PrayerMode;
  loggedForDate: string;
  occurredAt: string;
}

export interface PrayerDayView {
  date: string;
  rows: PrayerLogRow[];
  byPrayer: Record<PrayerName, PrayerLogRow | null>;
}
