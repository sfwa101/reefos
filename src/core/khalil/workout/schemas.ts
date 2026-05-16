/**
 * Khalil — Workout schemas (P2.7).
 *
 * Wire + runtime contracts for the Workout pillar. Append-only law:
 * sets are immutable forever; corrections insert correction rows that
 * reference the original via `correctsSetId`.
 */
import { z } from "zod";
import { clientEventIdSchema } from "../prayer/schemas"; // khalil-governance-allow: rule-2 (ADR-2026-P2.8-01: shared primitives pending extraction)

export const exerciseSlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,48}$/, "expected lowercase slug");

export const focusSchema = z.string().min(1).max(64).optional();

/** Cap how long an unclosed session is considered "live". */
export const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

export const startSessionInputSchema = z.object({
  focus: focusSchema,
  notesKey: z.string().min(1).max(120).optional(),
  clientEventId: clientEventIdSchema,
});
export type StartSessionInput = z.infer<typeof startSessionInputSchema>;

export const closeSessionInputSchema = z.object({
  sessionId: z.string().uuid(),
});
export type CloseSessionInput = z.infer<typeof closeSessionInputSchema>;

export const addSetInputSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseSlug: exerciseSlugSchema,
  setIndex: z.number().int().min(1).max(999),
  reps: z.number().int().min(1).max(999),
  weightKg: z.number().min(0).max(1000),
  rpe: z.number().min(1).max(10).optional(),
  isCorrection: z.boolean().default(false),
  correctsSetId: z.string().uuid().optional(),
  clientEventId: clientEventIdSchema,
});
export type AddSetInput = z.infer<typeof addSetInputSchema>;

export const readHistoryInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});
export type ReadHistoryInput = z.infer<typeof readHistoryInputSchema>;

export interface WorkoutSessionRow {
  id: string;
  startedAt: string;
  closedAt: string | null;
  focus: string | null;
  notesKey: string | null;
}

export interface WorkoutSetRow {
  id: string;
  sessionId: string;
  exerciseSlug: string;
  setIndex: number;
  reps: number;
  weightKg: number;
  rpe: number | null;
  isCorrection: boolean;
  correctsSetId: string | null;
  createdAt: string;
}

export interface WorkoutCurrentDTO {
  /** Open session or null when no live session exists. */
  session: WorkoutSessionRow | null;
  /** Sets for the open session, in insertion order. */
  sets: WorkoutSetRow[];
  /** Server-derived total volume (kg) for the open session. */
  totalVolumeKg: number;
  /** Local hint: caller-visible "stale" decision (server stamps the ceiling). */
  isStale: boolean;
}

export interface WorkoutHistoryItemDTO {
  session: WorkoutSessionRow;
  setsCount: number;
  totalVolumeKg: number;
}
