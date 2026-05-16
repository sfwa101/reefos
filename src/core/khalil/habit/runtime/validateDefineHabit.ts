/**
 * Khalil — Habit definition validation (pure).
 *
 * Mirrors the DB CHECK constraints so the gateway returns a typed
 * verdict before reaching Postgres. No I/O, no React.
 */
import {
  defineHabitInputSchema,
  type DefineHabitInput,
} from "../schemas";

export type DefineHabitVerdict =
  | { ok: true; value: DefineHabitInput }
  | { ok: false; reason: "invalid_slug" | "invalid_cadence" | "invalid_target" | "invalid_payload" };

export function validateDefineHabit(input: unknown): DefineHabitVerdict {
  const parsed = defineHabitInputSchema.safeParse(input);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "slug") return { ok: false, reason: "invalid_slug" };
    if (path === "cadence") return { ok: false, reason: "invalid_cadence" };
    if (path === "targetPerDay") return { ok: false, reason: "invalid_target" };
    return { ok: false, reason: "invalid_payload" };
  }
  return { ok: true, value: parsed.data };
}
