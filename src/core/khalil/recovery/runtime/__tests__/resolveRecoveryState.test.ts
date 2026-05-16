import { describe, it, expect } from "vitest";
import { resolveRecoveryState, isRecoverySoftened } from "../resolveRecoveryState";
import type { RecoveryEventRow } from "../../schemas";

const ev = (
  from: RecoveryEventRow["fromState"],
  to: RecoveryEventRow["toState"],
  at: string,
  reason: string | null = null,
): RecoveryEventRow => ({
  id: `${from}->${to}@${at}`,
  fromState: from,
  toState: to,
  reason,
  createdAt: at,
});

describe("resolveRecoveryState", () => {
  it("returns off when log is empty", () => {
    const r = resolveRecoveryState([]);
    expect(r.currentState).toBe("off");
    expect(r.appliedCount).toBe(0);
  });

  it("reconstructs final state by replaying valid events", () => {
    const events: RecoveryEventRow[] = [
      ev("off", "soft", "2026-01-01T10:00:00Z"),
      ev("soft", "hard", "2026-01-02T10:00:00Z", "burnout window"),
      ev("hard", "soft", "2026-01-05T10:00:00Z"),
    ];
    const r = resolveRecoveryState(events);
    expect(r.currentState).toBe("soft");
    expect(r.enteredAt).toBe("2026-01-05T10:00:00Z");
    expect(r.appliedCount).toBe(3);
  });

  it("skips invalid transitions during replay", () => {
    const events: RecoveryEventRow[] = [
      ev("off", "soft", "2026-01-01T10:00:00Z"),
      // illegal jump — must be skipped
      ev("soft", "hard", "2026-01-02T10:00:00Z"),
      ev("soft", "off", "2026-01-03T10:00:00Z"),
    ];
    const r = resolveRecoveryState(events);
    expect(r.currentState).toBe("off");
    expect(r.appliedCount).toBe(2);
  });

  it("isRecoverySoftened reports correctly", () => {
    expect(isRecoverySoftened("off")).toBe(false);
    expect(isRecoverySoftened("soft")).toBe(true);
    expect(isRecoverySoftened("hard")).toBe(true);
  });
});
