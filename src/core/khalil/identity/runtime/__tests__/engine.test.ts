import { describe, it, expect } from "vitest";
import {
  computeRollingWindows,
  computeIdentityScore,
  resolveIdentityLevel,
  shouldEvolveIdentity,
  computeIdentity,
  type AdherenceDay,
} from "../engine";

const today = "2026-05-16";

function makeDays(scores: ReadonlyArray<number>): AdherenceDay[] {
  // scores[0] = today, scores[1] = yesterday, ...
  return scores.map((s, i) => {
    const d = new Date(`${today}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - i);
    return { date: d.toISOString().slice(0, 10), combinedScore: s };
  });
}

describe("computeRollingWindows", () => {
  it("returns zeros for empty history", () => {
    const w = computeRollingWindows([], today);
    expect(w).toEqual({ window30d: 0, window90d: 0, window180d: 0, observedDays: 0 });
  });

  it("averages only days inside each window", () => {
    const days = makeDays(Array.from({ length: 200 }, () => 0.8));
    const w = computeRollingWindows(days, today);
    expect(w.window30d).toBeCloseTo(0.8, 3);
    expect(w.window90d).toBeCloseTo(0.8, 3);
    expect(w.window180d).toBeCloseTo(0.8, 3);
    expect(w.observedDays).toBe(180); // bounded by 180d window
  });

  it("is deterministic for identical inputs", () => {
    const days = makeDays([0.5, 0.7, 0.9, 0.3]);
    expect(computeRollingWindows(days, today)).toEqual(
      computeRollingWindows(days, today),
    );
  });
});

describe("computeIdentityScore", () => {
  it("applies weighted blend with no recovery", () => {
    const score = computeIdentityScore(
      { window30d: 1, window90d: 1, window180d: 1, observedDays: 180 },
      "off",
    );
    expect(score).toBe(1);
  });

  it("softens with hard recovery and caps at 1", () => {
    const score = computeIdentityScore(
      { window30d: 0.95, window90d: 0.95, window180d: 0.95, observedDays: 180 },
      "hard",
    );
    expect(score).toBe(1);
  });

  it("soft recovery >= off recovery score", () => {
    const w = { window30d: 0.5, window90d: 0.5, window180d: 0.5, observedDays: 90 };
    expect(computeIdentityScore(w, "soft")).toBeGreaterThanOrEqual(
      computeIdentityScore(w, "off"),
    );
  });
});

describe("resolveIdentityLevel", () => {
  it("returns seed below stable threshold", () => {
    expect(
      resolveIdentityLevel(0.1, { window30d: 0, window90d: 0, window180d: 0, observedDays: 0 }),
    ).toBe("seed");
  });

  it("requires minimum observation days", () => {
    expect(
      resolveIdentityLevel(0.9, { window30d: 0.9, window90d: 0.9, window180d: 0.9, observedDays: 5 }),
    ).toBe("seed");
  });

  it("reaches sovereign with full history + max score", () => {
    expect(
      resolveIdentityLevel(0.9, { window30d: 0.9, window90d: 0.9, window180d: 0.9, observedDays: 180 }),
    ).toBe("sovereign");
  });
});

describe("shouldEvolveIdentity", () => {
  it("never jumps more than one level up", () => {
    const r = shouldEvolveIdentity({ previous: "seed", resolved: "sovereign", recovery: "off" });
    expect(r.level).toBe("stable");
    expect(r.transitioned).toBe(true);
  });

  it("hard recovery alone cannot demote", () => {
    const r = shouldEvolveIdentity({ previous: "rising", resolved: "seed", recovery: "hard" });
    expect(r.level).toBe("rising");
    expect(r.transitioned).toBe(false);
  });

  it("off recovery allows natural demotion", () => {
    const r = shouldEvolveIdentity({ previous: "rising", resolved: "stable", recovery: "off" });
    expect(r.level).toBe("stable");
  });

  it("no-op when resolved equals previous", () => {
    const r = shouldEvolveIdentity({ previous: "stable", resolved: "stable", recovery: "off" });
    expect(r.transitioned).toBe(false);
  });
});

describe("computeIdentity (idempotency)", () => {
  it("same inputs produce same outputs", () => {
    const days = makeDays(Array.from({ length: 60 }, () => 0.7));
    const a = computeIdentity({ days, today, recovery: "off", previousLevel: "seed" });
    const b = computeIdentity({ days, today, recovery: "off", previousLevel: "seed" });
    expect(a).toEqual(b);
  });
});
