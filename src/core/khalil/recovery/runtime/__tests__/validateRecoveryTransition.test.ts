import { describe, it, expect } from "vitest";
import { validateRecoveryTransition } from "../validateRecoveryTransition";

describe("validateRecoveryTransition", () => {
  it("rejects duplicate states", () => {
    const v = validateRecoveryTransition({ from: "off", to: "off" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("same_state");
  });

  it("rejects off -> hard direct jump", () => {
    const v = validateRecoveryTransition({ from: "off", to: "hard", reason: "burnout" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("illegal_transition");
  });

  it("rejects hard transition without reason", () => {
    const v = validateRecoveryTransition({ from: "soft", to: "hard" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("reason_required");
  });

  it("rejects hard transition with too-short reason", () => {
    const v = validateRecoveryTransition({ from: "soft", to: "hard", reason: "x" });
    expect(v.ok).toBe(false);
  });

  it("allows off -> soft", () => {
    expect(validateRecoveryTransition({ from: "off", to: "soft" }).ok).toBe(true);
  });

  it("allows soft -> off", () => {
    expect(validateRecoveryTransition({ from: "soft", to: "off" }).ok).toBe(true);
  });

  it("allows soft -> hard with reason", () => {
    const v = validateRecoveryTransition({ from: "soft", to: "hard", reason: "burnout" });
    expect(v.ok).toBe(true);
  });

  it("allows hard -> soft", () => {
    expect(validateRecoveryTransition({ from: "hard", to: "soft" }).ok).toBe(true);
  });
});
