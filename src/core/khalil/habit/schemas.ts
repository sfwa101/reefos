/**
 * Khalil — Habit schemas (P2.3).
 *
 * Wire-level + runtime contracts for the Habit pillar. Lives at the
 * sub-domain edge so the shape is single-sourced for gateway, runtime,
 * and UI. Locked by p1-data-ownership.md.
 */
import { z } from "zod";
import { isoDateSchema, clientEventIdSchema } from "../prayer/schemas"; // khalil-governance-allow: rule-2 (ADR-2026-P2.8-01: shared primitives pending extraction)

export const HABIT_CADENCES = ["daily", "weekdays", "custom"] as const;
export type HabitCadence = (typeof HABIT_CADENCES)[number];

export const HABIT_COMPLETION_MODES = [
  "normal",
  "recovery_yesterday",
  "manual_backfill",
] as const;
export type HabitCompletionMode = (typeof HABIT_COMPLETION_MODES)[number];

export const habitSlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{1,48}$/, "expected lowercase slug");

export const habitNameKeySchema = z.string().min(2).max(120);

export const habitCadenceSchema = z.enum(HABIT_CADENCES);
export const habitCompletionModeSchema = z.enum(HABIT_COMPLETION_MODES);

export const habitTargetPerDaySchema = z.number().int().min(1).max(20);
export const habitPartialSchema = z.number().min(0.01).max(1);

/** Write — define a new habit. */
export const defineHabitInputSchema = z.object({
  slug: habitSlugSchema,
  nameKey: habitNameKeySchema,
  cadence: habitCadenceSchema.default("daily"),
  targetPerDay: habitTargetPerDaySchema.default(1),
});
export type DefineHabitInput = z.infer<typeof defineHabitInputSchema>;

/** Write — archive an existing habit. */
export const archiveHabitInputSchema = z.object({
  habitId: z.string().uuid(),
});
export type ArchiveHabitInput = z.infer<typeof archiveHabitInputSchema>;

/** Write — complete a habit for a given local date. */
export const completeHabitInputSchema = z.object({
  habitId: z.string().uuid(),
  date: isoDateSchema,
  partial: habitPartialSchema.default(1),
  mode: habitCompletionModeSchema.default("normal"),
  /** Local hour [0..23] when the user pressed the button. */
  occurredAtClientHour: z.number().int().min(0).max(23),
  /** Local today date — server compares to `date` to allow yesterday only via recovery. */
  todayLocalDate: isoDateSchema,
  /** Recovery resolver stub: server treats `"off"` as forbidding backfill. */
  recoveryMode: z.enum(["off", "soft", "hard"]).default("off"),
  clientEventId: clientEventIdSchema,
});
export type CompleteHabitInput = z.infer<typeof completeHabitInputSchema>;

/** Read — habits for a given local date (definitions + that day's completions). */
export const readHabitsTodayInputSchema = z.object({
  date: isoDateSchema,
});
export type ReadHabitsTodayInput = z.infer<typeof readHabitsTodayInputSchema>;

export interface HabitDefinitionRow {
  id: string;
  slug: string;
  nameKey: string;
  cadence: HabitCadence;
  targetPerDay: number;
  createdAt: string;
  archivedAt: string | null;
}

export interface HabitCompletionRow {
  id: string;
  habitId: string;
  date: string;
  partial: number;
  mode: HabitCompletionMode;
  createdAt: string;
}

export interface HabitTodayView {
  date: string;
  definitions: HabitDefinitionRow[];
  completions: HabitCompletionRow[];
  /** Map habitId → completion (if any) for the requested date. */
  byHabit: Record<string, HabitCompletionRow | null>;
}
