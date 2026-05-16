/**
 * Khalil — Coach proposal schema tests (P2.6 §13).
 */
import { describe, it, expect } from "vitest";
import { validateCoachProposalDraft } from "../schema";
import { buildQuietDayFallback } from "../fallback";

describe("validateCoachProposalDraft", () => {
  it("accepts a clean fallback draft", () => {
    const v = validateCoachProposalDraft(buildQuietDayFallback());
    expect(v.ok).toBe(true);
  });

  it("strips/rejects unknown top-level fields", () => {
    const v = validateCoachProposalDraft({
      ...buildQuietDayFallback(),
      sneaky: "rm -rf",
    });
    expect(v.ok).toBe(false);
  });

  it("rejects arbitrary capability intents", () => {
    const v = validateCoachProposalDraft({
      ...buildQuietDayFallback(),
      payload: {
        copyKey: "khalil.coach.copy.quiet_day",
        intent: { capability: "khalil.admin.escalate", params: {} },
      },
    });
    expect(v.ok).toBe(false);
  });

  it("rejects payload free-form keys", () => {
    const v = validateCoachProposalDraft({
      ...buildQuietDayFallback(),
      payload: {
        copyKey: "khalil.coach.copy.quiet_day",
        rawText: "model said something",
      },
    });
    expect(v.ok).toBe(false);
  });

  it("rejects out-of-range ttl", () => {
    const v = validateCoachProposalDraft({
      ...buildQuietDayFallback(),
      ttlSeconds: 9999999,
    });
    expect(v.ok).toBe(false);
  });

  it("accepts a valid intent for an allowlisted capability", () => {
    const v = validateCoachProposalDraft({
      kind: "gentle-reminder",
      copyKey: "khalil.coach.copy.one_small_step",
      payload: {
        copyKey: "khalil.coach.copy.one_small_step",
        intent: { capability: "khalil.habit.complete.write" },
      },
      ttlSeconds: 3600,
      promptVersion: "khalil.coach.v1",
    });
    expect(v.ok).toBe(true);
  });
});
