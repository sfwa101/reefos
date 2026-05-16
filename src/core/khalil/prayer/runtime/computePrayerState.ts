/**
 * Khalil — Prayer day-state computation (P2.2).
 *
 * Pure: takes raw log rows for a single (user, date) and produces the
 * `PrayerDayView` UI consumes. No I/O. Reusable by the projection
 * subscriber, the replay job, and the read gateway.
 */
import {
  PRAYER_NAMES,
  type PrayerDayView,
  type PrayerLogRow,
  type PrayerName,
} from "../schemas";

export function computePrayerDayView(
  date: string,
  rows: readonly PrayerLogRow[],
): PrayerDayView {
  const byPrayer: Record<PrayerName, PrayerLogRow | null> = {
    fajr: null,
    dhuhr: null,
    asr: null,
    maghrib: null,
    isha: null,
  };

  // First-write-wins per (date, prayer) — additional modes (e.g. qadaa
  // recorded later) live in `rows` for audit but don't overwrite the
  // canonical entry surfaced by the block. Order from gateway: ASC
  // by occurred_at.
  for (const r of rows) {
    if (r.loggedForDate !== date) continue;
    if (!PRAYER_NAMES.includes(r.prayer)) continue;
    if (byPrayer[r.prayer] === null) byPrayer[r.prayer] = r;
  }

  return { date, rows: [...rows], byPrayer };
}
