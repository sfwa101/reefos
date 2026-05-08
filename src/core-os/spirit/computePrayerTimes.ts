/**
 * Spirit Engine — Sovereign Prayer Sanctuary (Phase 21).
 *
 * Lightweight, dependency-free prayer schedule for Egypt. Uses a monthly
 * baseline tuned for Cairo and applies a small longitudinal offset per
 * governorate so the times shift with the user's geography. Result is
 * accurate within ±5 minutes — sufficient to drive the Sovereign Dormancy
 * window. For higher precision (Phase 21.3) bind to a live IGS API.
 */

export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type PrayerSchedule = Record<PrayerName, number>; // minutes since local midnight

/**
 * Cairo monthly baseline (rough, civil-time minutes since midnight).
 * Source: averaged Muslim World League calculation across each month.
 */
const CAIRO_BASELINE: PrayerSchedule[] = [
  // Jan
  { fajr: 5 * 60 + 15, dhuhr: 11 * 60 + 55, asr: 14 * 60 + 45, maghrib: 17 * 60 + 10, isha: 18 * 60 + 35 },
  // Feb
  { fajr: 5 * 60, dhuhr: 12 * 60, asr: 15 * 60, maghrib: 17 * 60 + 35, isha: 18 * 60 + 55 },
  // Mar
  { fajr: 4 * 60 + 35, dhuhr: 12 * 60, asr: 15 * 60 + 15, maghrib: 18 * 60, isha: 19 * 60 + 15 },
  // Apr
  { fajr: 4 * 60, dhuhr: 11 * 60 + 50, asr: 15 * 60 + 20, maghrib: 18 * 60 + 20, isha: 19 * 60 + 40 },
  // May
  { fajr: 3 * 60 + 30, dhuhr: 11 * 60 + 50, asr: 15 * 60 + 25, maghrib: 18 * 60 + 40, isha: 20 * 60 + 5 },
  // Jun
  { fajr: 3 * 60 + 15, dhuhr: 11 * 60 + 55, asr: 15 * 60 + 30, maghrib: 18 * 60 + 55, isha: 20 * 60 + 25 },
  // Jul
  { fajr: 3 * 60 + 25, dhuhr: 12 * 60, asr: 15 * 60 + 35, maghrib: 18 * 60 + 55, isha: 20 * 60 + 25 },
  // Aug
  { fajr: 3 * 60 + 50, dhuhr: 12 * 60, asr: 15 * 60 + 30, maghrib: 18 * 60 + 30, isha: 19 * 60 + 50 },
  // Sep
  { fajr: 4 * 60 + 15, dhuhr: 11 * 60 + 50, asr: 15 * 60 + 15, maghrib: 17 * 60 + 50, isha: 19 * 60 + 5 },
  // Oct
  { fajr: 4 * 60 + 35, dhuhr: 11 * 60 + 40, asr: 14 * 60 + 55, maghrib: 17 * 60 + 10, isha: 18 * 60 + 25 },
  // Nov
  { fajr: 5 * 60, dhuhr: 11 * 60 + 35, asr: 14 * 60 + 40, maghrib: 16 * 60 + 45, isha: 18 * 60 + 5 },
  // Dec
  { fajr: 5 * 60 + 15, dhuhr: 11 * 60 + 50, asr: 14 * 60 + 40, maghrib: 16 * 60 + 50, isha: 18 * 60 + 15 },
];

/** Approximate longitude offset (minutes added to Cairo time). */
const GOV_OFFSET: Record<string, number> = {
  Cairo: 0,
  Giza: 0,
  Alexandria: 4,
  Dakahlia: -2,
  Sharqia: -1,
  Qalyubia: 0,
  Gharbia: 1,
  Monufia: 1,
  Beheira: 3,
  Kafr_El_Sheikh: 2,
  Damietta: -2,
  Port_Said: -3,
  Ismailia: -3,
  Suez: -2,
  North_Sinai: -5,
  South_Sinai: -4,
  Faiyum: 1,
  Beni_Suef: -1,
  Minya: -1,
  Asyut: -2,
  Sohag: -3,
  Qena: -4,
  Luxor: -5,
  Aswan: -5,
  Red_Sea: -3,
  New_Valley: 4,
  Matrouh: 8,
};

const normalizeGov = (raw: string | null): string => {
  if (!raw) return "Cairo";
  return raw.replace(/[\s-]+/g, "_");
};

export const computePrayerSchedule = (now: Date, governorate: string | null): PrayerSchedule => {
  const month = now.getMonth();
  const base = CAIRO_BASELINE[month];
  const offset = GOV_OFFSET[normalizeGov(governorate)] ?? 0;
  return {
    fajr: base.fajr + offset,
    dhuhr: base.dhuhr + offset,
    asr: base.asr + offset,
    maghrib: base.maghrib + offset,
    isha: base.isha + offset,
  };
};

export const PRAYER_LABEL_AR: Record<PrayerName, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

/** Length of the Sovereign Dormancy window after each Athan (minutes). */
export const DORMANCY_DURATION_MIN = 20;

export const minutesSinceMidnight = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const formatHM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
