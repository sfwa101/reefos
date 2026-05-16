/**
 * Khalil — Weight schemas (P2.7).
 *
 * Append-only. Plausible kg range enforced both client-side (zod) and
 * server-side (DB check). One measurement per local date.
 */
import { z } from "zod";
import { isoDateSchema, clientEventIdSchema } from "../prayer/schemas"; // khalil-governance-allow: rule-2 (ADR-2026-P2.8-01: shared primitives pending extraction)

export const WEIGHT_MIN_KG = 20;
export const WEIGHT_MAX_KG = 500;

export const weightSourceSchema = z.enum(["manual", "imported"]);
export type WeightSource = z.infer<typeof weightSourceSchema>;

export const writeMeasurementInputSchema = z.object({
  forDate: isoDateSchema,
  weightKg: z.number().min(WEIGHT_MIN_KG).max(WEIGHT_MAX_KG),
  source: weightSourceSchema.default("manual"),
  clientEventId: clientEventIdSchema,
});
export type WriteMeasurementInput = z.infer<typeof writeMeasurementInputSchema>;

export const readTrendInputSchema = z.object({}).default({});
export type ReadTrendInput = z.infer<typeof readTrendInputSchema>;

export type WeightTrendDirection = "down" | "flat" | "up";

export interface WeightMeasurementRow {
  id: string;
  forDate: string;
  weightKg: number;
  source: WeightSource;
  createdAt: string;
}

export interface WeightTrendDTO {
  latestKg: number | null;
  latestForDate: string | null;
  avg7d: number | null;
  avg30d: number | null;
  avg90d: number | null;
  delta7d: number | null;
  delta30d: number | null;
  delta90d: number | null;
  trendDirection: WeightTrendDirection;
  measurementsCount: number;
}
