/**
 * Khalil — Mission engine determinism tests (P3.2).
 */
import { describe, it, expect } from "vitest";
import { composeDailyJourney } from "../engine";
import { planMissions } from "../planner";
import { replayMissions } from "../replay";
import type { MissionInputs } from "../contracts";
import type { IntelligenceSnapshot } from "../../intelligence/contracts/types";

function snap(overrides: Partial<IntelligenceSnapshot> = {}): IntelligenceSnapshot {
  return {
    generatedAt: "2026-05-17T08:00:00.000Z",
    replayVersion: 1,
    identityLevel: "rising",
    recovery: "off",
    signals: [
      { key: "prayer_streak_risk", score: 40, confidence: 1, severity: "medium", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
      { key: "burnout_risk", score: 30, confidence: 1, severity: "low", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
      { key: "overtraining_risk", score: 20, confidence: 1, severity: "low", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
      { key: "low_sleep_recovery", score: 30, confidence: 1, severity: "low", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
      { key: "consistency_surge", score: 50, confidence: 1, severity: "medium", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
      { key: "momentum_gain", score: 40, confidence: 1, severity: "medium", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
      { key: "discipline_growth", score: 55, confidence: 1, severity: "medium", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
      { key: "identity_alignment", score: 80, confidence: 1, severity: "high", explanationKey: "x", generatedAt: "2026-05-17T08:00:00.000Z" },
    ],
    priorities: [],
    nudges: [],
    weeklyFocus: {
      primaryFocus: "habits",
      secondaryFocus: "spiritual",
      recoveryEmphasis: "low",
      spiritualEmphasis: "medium",
      bodyEmphasis: "medium",
      forbiddenOverloads: [],
      rationaleKey: "x",
      generatedAt: "2026-05-17T08:00:00.000Z",
    },
    inputsDigest: "deadbeef",
    ...overrides,
  };
}

function inputs(overrides: Partial<MissionInputs> = {}): MissionInputs {
  return {
    now: "2026-05-17T08:00:00.000Z",
    localDate: "2026-05-17",
    userId: "user-1",
    identityLevel: "rising",
    identityScore: 60,
    recovery: "off",
    intelligence: snap(),
    recentFailures: 0,
    activeStreakDays: 0,
    ...overrides,
  };
}

describe("missions: deterministic generation", () => {
  it("produces byte-identical missions for identical inputs", () => {
    const a = planMissions(inputs());
    const b = planMissions(inputs());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces byte-identical journey for identical inputs", () => {
    const a = composeDailyJourney(inputs());
    const b = composeDailyJourney(inputs());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("replay digest is stable", () => {
    const a = replayMissions(inputs());
    const b = replayMissions(inputs());
    expect(a.digest).toBe(b.digest);
  });
});

describe("missions: adaptation rules", () => {
  it("forbids resilience_push under hard recovery", () => {
    const m = planMissions(inputs({ recovery: "hard", identityLevel: "sovereign" }));
    expect(m.find((x) => x.missionType === "resilience_push")).toBeUndefined();
    expect(m.find((x) => x.missionType === "body_rebuild")).toBeUndefined();
  });

  it("downgrades intensity with recent failures", () => {
    const clean = planMissions(inputs({ identityLevel: "disciplined" }));
    const failing = planMissions(inputs({ identityLevel: "disciplined", recentFailures: 4 }));
    const cleanDisc = clean.find((m) => m.missionType === "discipline_chain");
    const failDisc = failing.find((m) => m.missionType === "discipline_chain");
    if (cleanDisc && failDisc) {
      expect(failDisc.intensity).toBeLessThan(cleanDisc.intensity);
    }
  });

  it("escalates intensity on long streak", () => {
    const base = planMissions(inputs({ identityLevel: "disciplined" }));
    const streak = planMissions(inputs({ identityLevel: "disciplined", activeStreakDays: 14 }));
    const baseDisc = base.find((m) => m.missionType === "discipline_chain");
    const streakDisc = streak.find((m) => m.missionType === "discipline_chain");
    if (baseDisc && streakDisc) {
      expect(streakDisc.intensity).toBeGreaterThanOrEqual(baseDisc.intensity);
    }
  });

  it("gates high-tier missions behind identity level", () => {
    const seed = planMissions(inputs({ identityLevel: "seed" }));
    expect(seed.find((m) => m.missionType === "resilience_push")).toBeUndefined();
    expect(seed.find((m) => m.missionType === "deep_focus")).toBeUndefined();
  });
});

describe("missions: journey emphasis", () => {
  it("hard recovery yields high recovery emphasis + protections", () => {
    const j = composeDailyJourney(inputs({ recovery: "hard" }));
    expect(j.recoveryEmphasis).toBe("high");
    expect(j.antiOverloadProtections).toContain("no_high_intensity_today");
  });

  it("prayer risk steers supportingHabitFocus to spiritual", () => {
    const j = composeDailyJourney(
      inputs({
        intelligence: snap({
          signals: snap().signals.map((s) =>
            s.key === "prayer_streak_risk" ? { ...s, score: 80, severity: "high" } : s,
          ),
        }),
      }),
    );
    expect(j.supportingHabitFocus).toBe("spiritual");
  });
});
