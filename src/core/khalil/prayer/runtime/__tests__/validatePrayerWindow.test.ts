/**
 * Khalil — Prayer window runtime tests (P2.2).
 */
import { describe, expect, it } from "vitest";
import { validatePrayerWindow } from "../validatePrayerWindow";

describe("validatePrayerWindow", () => {
  const today = "2026-05-16";

  it("rejects future date", () => {
    const r = validatePrayerWindow({
      prayer: "fajr",
      mode: "on_time",
      loggedForDate: "2026-05-17",
      todayLocalDate: today,
      occurredAtClientHour: 5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("future_date_not_allowed");
  });

  it("rejects on_time for past day", () => {
    const r = validatePrayerWindow({
      prayer: "fajr",
      mode: "on_time",
      loggedForDate: "2026-05-15",
      todayLocalDate: today,
      occurredAtClientHour: 5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("on_time_requires_today");
  });

  it("accepts on_time fajr within window", () => {
    expect(
      validatePrayerWindow({
        prayer: "fajr",
        mode: "on_time",
        loggedForDate: today,
        todayLocalDate: today,
        occurredAtClientHour: 5,
      }).ok,
    ).toBe(true);
  });

  it("rejects on_time fajr outside window", () => {
    const r = validatePrayerWindow({
      prayer: "fajr",
      mode: "on_time",
      loggedForDate: today,
      todayLocalDate: today,
      occurredAtClientHour: 10,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("outside_prayer_window");
  });

  it("rejects qadaa for today", () => {
    const r = validatePrayerWindow({
      prayer: "asr",
      mode: "qadaa",
      loggedForDate: today,
      todayLocalDate: today,
      occurredAtClientHour: 16,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("qadaa_requires_past_date");
  });

  it("accepts qadaa for past day regardless of hour", () => {
    expect(
      validatePrayerWindow({
        prayer: "asr",
        mode: "qadaa",
        loggedForDate: "2026-05-10",
        todayLocalDate: today,
        occurredAtClientHour: 23,
      }).ok,
    ).toBe(true);
  });
});
