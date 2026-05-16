import { describe, it, expect } from "vitest";
import { composeIntelligenceSnapshot } from "../replay/composeSnapshot";
import { computeSovereignSignals } from "../signals/computeSignals";
import { composeNudgeProposals } from "../nudges/composeNudges";
import type { IntelligenceInputs } from "../contracts/types";

function baseInputs(overrides: Partial<IntelligenceInputs> = {}): IntelligenceInputs {
  return {
    now: "2026-05-16T10:00:00.000Z",
    identityLevel: "stable",
    identityScore: 55,
    recovery: "off",
    adherence14d: Array.from({ length: 14 }, (_, i) => 0.6 + i * 0.02),
    prayer14d: Array.from({ length: 14 }, () => 0.8),
    habit14d: Array.from({ length: 14 }, () => 0.5),
    workoutVolume14d: Array.from({ length: 14 }, () => 5000),
    pendingCoachProposalKind: null,
    ...overrides,
  };
}

describe("sovereign intelligence — determinism", () => {
  it("computes identical snapshots for identical inputs", () => {
    const a = composeIntelligenceSnapshot(baseInputs());
    const b = composeIntelligenceSnapshot(baseInputs());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("emits all ten signal keys", () => {
    const s = computeSovereignSignals(baseInputs());
    expect(s).toHaveLength(10);
    for (const sig of s) {
      expect(sig.score).toBeGreaterThanOrEqual(0);
      expect(sig.score).toBeLessThanOrEqual(100);
      expect(sig.confidence).toBeGreaterThanOrEqual(0);
      expect(sig.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("hard recovery forbids body overloads in weekly focus", () => {
    const snap = composeIntelligenceSnapshot(baseInputs({ recovery: "hard" }));
    expect(snap.weeklyFocus.primaryFocus).toBe("recovery");
    expect(snap.weeklyFocus.forbiddenOverloads).toContain("body");
  });

  it("falling prayer adherence raises prayer_streak_risk", () => {
    const s = computeSovereignSignals(
      baseInputs({
        prayer14d: [
          0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, // older
          0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, // recent
        ],
      }),
    );
    const risk = s.find((x) => x.key === "prayer_streak_risk");
    expect(risk).toBeDefined();
    expect(risk!.score).toBeGreaterThanOrEqual(60);
  });

  it("nudge ids are deterministic", () => {
    const inputs = baseInputs({ recovery: "hard" });
    const sigs = computeSovereignSignals(inputs);
    const n1 = composeNudgeProposals(inputs, sigs);
    const n2 = composeNudgeProposals(inputs, sigs);
    expect(n1.map((n) => n.id)).toEqual(n2.map((n) => n.id));
  });

  it("priorities sort recovery banner first when in hard recovery", () => {
    const snap = composeIntelligenceSnapshot(baseInputs({ recovery: "hard" }));
    expect(snap.priorities[0].blockKind).toBe("khalil.recovery.banner");
  });
});
