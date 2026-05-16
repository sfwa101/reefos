import { describe, it, expect } from "vitest";
import {
  computePrayerAdherence,
  computeHabitAdherence,
  computeCombinedAdherence,
} from "../computeAdherence";
import type { PrayerLogRow } from "../../prayer/schemas";
import type {
  HabitCompletionRow,
  HabitDefinitionRow,
} from "../../habit/schemas";

const prayerRow = (
  prayer: PrayerLogRow["prayer"],
  mode: PrayerLogRow["mode"],
): PrayerLogRow => ({
  id: `${prayer}-${mode}`,
  prayer,
  mode,
  loggedForDate: "2026-05-16",
  occurredAt: "2026-05-16T08:00:00Z",
});

describe("computePrayerAdherence", () => {
  it("returns 0 when no rows", () => {
    expect(computePrayerAdherence({ rows: [] })).toBe(0);
  });
  it("returns 1 when all five on time", () => {
    expect(
      computePrayerAdherence({
        rows: [
          prayerRow("fajr", "on_time"),
          prayerRow("dhuhr", "on_time"),
          prayerRow("asr", "on_time"),
          prayerRow("maghrib", "on_time"),
          prayerRow("isha", "on_time"),
        ],
      }),
    ).toBe(1);
  });
  it("counts qadaa as half", () => {
    expect(
      computePrayerAdherence({
        rows: [prayerRow("fajr", "qadaa"), prayerRow("dhuhr", "on_time")],
      }),
    ).toBeCloseTo(0.3, 3);
  });
});

const def = (id: string, target = 1, archivedAt: string | null = null): HabitDefinitionRow => ({
  id,
  slug: id,
  nameKey: `khalil.habit.${id}`,
  cadence: "daily",
  targetPerDay: target,
  createdAt: "2026-05-01T00:00:00Z",
  archivedAt,
});

const comp = (
  habitId: string,
  partial = 1,
  date = "2026-05-16",
): HabitCompletionRow => ({
  id: `c-${habitId}`,
  habitId,
  date,
  partial,
  mode: "normal",
  createdAt: `${date}T10:00:00Z`,
});

describe("computeHabitAdherence", () => {
  it("returns 0 when no active habits", () => {
    expect(
      computeHabitAdherence({
        date: "2026-05-16",
        definitions: [],
        completions: [],
      }),
    ).toBe(0);
  });
  it("computes ratio over active targets", () => {
    expect(
      computeHabitAdherence({
        date: "2026-05-16",
        definitions: [def("a", 1), def("b", 2)],
        completions: [comp("a"), comp("b", 0.5)],
      }),
    ).toBeCloseTo(0.5, 3);
  });
  it("ignores future-archived completions", () => {
    expect(
      computeHabitAdherence({
        date: "2026-05-16",
        definitions: [def("a", 1, "2026-05-10T00:00:00Z")],
        completions: [],
      }),
    ).toBe(0);
  });
  it("is deterministic on identical inputs", () => {
    const i = {
      date: "2026-05-16",
      definitions: [def("a", 2), def("b", 1)],
      completions: [comp("a", 0.5), comp("b")],
    };
    expect(computeHabitAdherence(i)).toBe(computeHabitAdherence(i));
  });
});

describe("computeCombinedAdherence", () => {
  it("falls back to prayer when no habits", () => {
    expect(
      computeCombinedAdherence({
        prayerScore: 0.8,
        habitScore: 0,
        hasActiveHabits: false,
      }),
    ).toBe(0.8);
  });
  it("averages pillars when habits active", () => {
    expect(
      computeCombinedAdherence({
        prayerScore: 0.6,
        habitScore: 0.4,
        hasActiveHabits: true,
      }),
    ).toBe(0.5);
  });
});
