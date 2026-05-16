import { describe, expect, it } from "vitest";
import { computePrayerDayView } from "../computePrayerState";
import type { PrayerLogRow } from "../../schemas";

const row = (over: Partial<PrayerLogRow>): PrayerLogRow => ({
  id: "r",
  prayer: "fajr",
  mode: "on_time",
  loggedForDate: "2026-05-16",
  occurredAt: "2026-05-16T05:00:00Z",
  ...over,
});

describe("computePrayerDayView", () => {
  it("returns empty map for no rows", () => {
    const v = computePrayerDayView("2026-05-16", []);
    expect(v.byPrayer.fajr).toBeNull();
    expect(v.rows).toEqual([]);
  });

  it("first-write-wins per prayer", () => {
    const r1 = row({ id: "a", prayer: "asr" });
    const r2 = row({ id: "b", prayer: "asr", mode: "qadaa" });
    const v = computePrayerDayView("2026-05-16", [r1, r2]);
    expect(v.byPrayer.asr?.id).toBe("a");
    expect(v.rows).toHaveLength(2);
  });

  it("ignores rows from other dates", () => {
    const r = row({ loggedForDate: "2026-05-15" });
    const v = computePrayerDayView("2026-05-16", [r]);
    expect(v.byPrayer.fajr).toBeNull();
  });
});
