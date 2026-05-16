import { describe, it, expect } from "vitest";
import { classifyHabitInsertError } from "../dedupeHabitCompletion";

describe("classifyHabitInsertError", () => {
  it("returns fresh for null", () => {
    expect(classifyHabitInsertError(null)).toBe("fresh");
  });
  it("treats client_event_id violation as replay", () => {
    expect(
      classifyHabitInsertError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "khalil_habit_completion_client_event_unique"',
      }),
    ).toBe("replay_duplicate");
  });
  it("treats other 23505 as semantic", () => {
    expect(
      classifyHabitInsertError({
        code: "23505",
        message: "duplicate key value violates unique constraint khalil_habit_completion_dedupe",
      }),
    ).toBe("semantic_duplicate");
  });
});
