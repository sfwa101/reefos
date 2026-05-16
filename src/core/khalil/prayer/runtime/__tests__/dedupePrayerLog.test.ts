import { describe, expect, it } from "vitest";
import { classifyPrayerInsertError } from "../dedupePrayerLog";

describe("classifyPrayerInsertError", () => {
  it("treats null/non-23505 as fresh", () => {
    expect(classifyPrayerInsertError(null)).toBe("fresh");
    expect(classifyPrayerInsertError({ code: "42P01", message: "x" })).toBe("fresh");
  });

  it("classifies client_event_id collisions as replay_duplicate", () => {
    expect(
      classifyPrayerInsertError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "khalil_prayer_log_client_event_unique"',
      }),
    ).toBe("replay_duplicate");
  });

  it("classifies semantic collisions as semantic_duplicate", () => {
    expect(
      classifyPrayerInsertError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "khalil_prayer_log_dedupe"',
      }),
    ).toBe("semantic_duplicate");
  });
});
