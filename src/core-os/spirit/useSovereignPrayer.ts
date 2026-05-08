/**
 * useSovereignPrayer — Phase 21 Spirit Engine.
 *
 * Global, spatio-temporal prayer-aware store. Recomputes the active prayer
 * window every 30 seconds based on the user's governorate (from AuthContext)
 * and the local clock. While inside a window, `isDormant === true` — every
 * marketing surface that subscribes (Flash Sale tickers, banners) MUST
 * gracefully pause itself.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { useAuth } from "@/context/AuthContext";
import {
  computePrayerSchedule,
  DORMANCY_DURATION_MIN,
  minutesSinceMidnight,
  PRAYER_LABEL_AR,
  type PrayerName,
  type PrayerSchedule,
} from "./computePrayerTimes";

type State = {
  isDormant: boolean;
  activePrayer: PrayerName | null;
  nextPrayer: PrayerName | null;
  minutesUntilNext: number;
  schedule: PrayerSchedule | null;
  governorate: string | null;
  setSnapshot: (s: Partial<State>) => void;
};

export const useSovereignPrayerStore = create<State>((set) => ({
  isDormant: false,
  activePrayer: null,
  nextPrayer: null,
  minutesUntilNext: 0,
  schedule: null,
  governorate: null,
  setSnapshot: (s) => set(s),
}));

const ORDER: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

const tick = (governorate: string | null) => {
  const now = new Date();
  const schedule = computePrayerSchedule(now, governorate);
  const nowMin = minutesSinceMidnight(now);

  let active: PrayerName | null = null;
  let next: PrayerName | null = null;
  let minsToNext = 0;

  for (const name of ORDER) {
    const start = schedule[name];
    const end = start + DORMANCY_DURATION_MIN;
    if (nowMin >= start && nowMin < end) {
      active = name;
      break;
    }
    if (nowMin < start) {
      next = name;
      minsToNext = start - nowMin;
      break;
    }
  }

  // After Isha — next is tomorrow's Fajr
  if (!active && !next) {
    next = "fajr";
    minsToNext = 24 * 60 - nowMin + schedule.fajr;
  }

  useSovereignPrayerStore.getState().setSnapshot({
    isDormant: !!active,
    activePrayer: active,
    nextPrayer: next,
    minutesUntilNext: minsToNext,
    schedule,
    governorate,
  });
};

/** Mount once at the root to keep the global prayer state alive. */
export const useSovereignPrayer = (): void => {
  const { profile } = useAuth();
  const governorate = profile?.governorate ?? null;

  useEffect(() => {
    tick(governorate);
    const id = setInterval(() => tick(governorate), 30_000);
    return () => clearInterval(id);
  }, [governorate]);
};

export { PRAYER_LABEL_AR };
