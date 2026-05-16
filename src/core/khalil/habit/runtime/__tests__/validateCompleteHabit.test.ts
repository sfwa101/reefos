import { describe, it, expect } from "vitest";
import { validateCompleteHabit } from "../validateCompleteHabit";
import type { CompleteHabitInput } from "../../schemas";

const base: CompleteHabitInput = {
  habitId: "00000000-0000-0000-0000-000000000001",
  date: "2026-05-16",
  partial: 1,
  mode: "normal",
  occurredAtClientHour: 10,
  todayLocalDate: "2026-05-16",
  recoveryMode: "off",
  clientEventId: "evt-abc-1234",
};

describe("validateCompleteHabit", () => {
  it("allows same-day completion", () => {
    expect(validateCompleteHabit(base).ok).toBe(true);
  });
  it("rejects future date", () => {
    const v = validateCompleteHabit({ ...base, date: "2026-05-17" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("future_date");
  });
  it("rejects yesterday when recovery off", () => {
    const v = validateCompleteHabit({ ...base, date: "2026-05-15" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("recovery_required");
  });
  it("allows yesterday when recovery soft", () => {
    const v = validateCompleteHabit({
      ...base,
      date: "2026-05-15",
      recoveryMode: "soft",
    });
    expect(v.ok).toBe(true);
  });
  it("rejects stale dates", () => {
    const v = validateCompleteHabit({
      ...base,
      date: "2026-05-10",
      recoveryMode: "hard",
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("stale_date");
  });
  it("rejects invalid partials", () => {
    const v = validateCompleteHabit({ ...base, partial: 0 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("invalid_partial");
    const v2 = validateCompleteHabit({ ...base, partial: 1.5 });
    expect(v2.ok).toBe(false);
  });
});
