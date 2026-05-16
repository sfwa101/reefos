/**
 * Khalil — Coach prompt determinism tests (P2.6 §13).
 */
import { describe, it, expect } from "vitest";
import { buildCoachPrompt, PROMPT_VERSION } from "../prompts.server";
import type { CoachSnapshot } from "../snapshot";

const snap: CoachSnapshot = {
  userId: "u",
  localDate: "2026-05-16",
  identityLevel: "seed",
  recovery: "off",
  adherence: { combinedScore: 0.42, prayerScore: 0.6, habitScore: 0.3 },
  activePillars: ["prayer", "habit"],
  recentProposalKinds: ["gentle-reminder"],
};

describe("buildCoachPrompt", () => {
  it("is deterministic for identical snapshots", () => {
    const a = buildCoachPrompt(snap);
    const b = buildCoachPrompt(snap);
    expect(a).toEqual(b);
    expect(a.promptVersion).toBe(PROMPT_VERSION);
  });

  it("normalizes pillar ordering", () => {
    const reordered = buildCoachPrompt({
      ...snap,
      activePillars: ["habit", "prayer"],
    });
    expect(reordered.user).toEqual(buildCoachPrompt(snap).user);
  });
});
