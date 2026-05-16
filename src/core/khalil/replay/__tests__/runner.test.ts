import { describe, expect, it } from "vitest";
import { runReplay } from "../runner";

describe("runReplay", () => {
  it("preserves declared ordering", async () => {
    const seen: string[] = [];
    const report = await runReplay({
      only: ["adherence", "streaks", "identity"],
      dispatch: async (k) => {
        seen.push(k);
      },
    });
    expect(seen).toEqual(["adherence", "streaks", "identity"]);
    expect(report.every((r) => r.ok)).toBe(true);
  });

  it("stops on first failure when stopOnError is true", async () => {
    const report = await runReplay({
      only: ["adherence", "streaks"],
      dispatch: async (k) => {
        if (k === "adherence") throw new Error("boom");
      },
    });
    expect(report).toHaveLength(1);
    expect(report[0].ok).toBe(false);
    expect(report[0].error).toBe("boom");
  });
});
