/**
 * Khalil — Prayer window + qadaa validation (P2.2).
 *
 * Pure runtime. No I/O, no React, no supabase. Deterministic so it can
 * be exercised in unit tests and reused by future capabilities
 * (e.g. coach proposals) without touching the gateway.
 *
 * NOTE — MVP astronomical scope:
 *   Real prayer times require lat/lng + calculation method (MWL, ISNA…).
 *   That dependency lands in a later pillar (ADR-K00x). For MVP we use
 *   coarse hour windows in the user's local time so the law
 *   ("must fall within prayer window") is enforced without pulling an
 *   external library into the kernel.
 */
import type { PrayerMode, PrayerName } from "../schemas";

export type PrayerWindowError =
  | "future_date_not_allowed"
  | "on_time_requires_today"
  | "qadaa_requires_past_date"
  | "outside_prayer_window";

export interface PrayerWindowOk {
  ok: true;
}
export interface PrayerWindowFail {
  ok: false;
  reason: PrayerWindowError;
}
export type PrayerWindowResult = PrayerWindowOk | PrayerWindowFail;

/** Coarse local-hour windows for MVP — half-open `[from, to)`. */
export const PRAYER_HOUR_WINDOWS: Readonly<Record<PrayerName, readonly [number, number]>> =
  Object.freeze({
    fajr: [3, 7],
    dhuhr: [11, 15],
    asr: [15, 18],
    maghrib: [17, 20],
    isha: [19, 24],
  });

export interface ValidatePrayerWindowInput {
  prayer: PrayerName;
  mode: PrayerMode;
  loggedForDate: string;
  todayLocalDate: string;
  occurredAtClientHour: number;
}

export function validatePrayerWindow(
  input: ValidatePrayerWindowInput,
): PrayerWindowResult {
  const { prayer, mode, loggedForDate, todayLocalDate, occurredAtClientHour } = input;

  if (loggedForDate > todayLocalDate) {
    return { ok: false, reason: "future_date_not_allowed" };
  }

  if (mode === "on_time") {
    if (loggedForDate !== todayLocalDate) {
      return { ok: false, reason: "on_time_requires_today" };
    }
    const [from, to] = PRAYER_HOUR_WINDOWS[prayer];
    if (occurredAtClientHour < from || occurredAtClientHour >= to) {
      return { ok: false, reason: "outside_prayer_window" };
    }
    return { ok: true };
  }

  // qadaa
  if (loggedForDate >= todayLocalDate) {
    return { ok: false, reason: "qadaa_requires_past_date" };
  }
  return { ok: true };
}
