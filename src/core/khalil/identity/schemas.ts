/**
 * Khalil — Identity engine DTO schemas (P2.5).
 *
 * Validation lives on the gateway boundary. UI never re-derives.
 */
import { z } from "zod";
import { KHALIL_IDENTITY_LEVELS, type KhalilIdentityLevel } from "./runtime/config";

export const identityLevelSchema = z.enum(KHALIL_IDENTITY_LEVELS);

/** Read input — no params (always scoped to caller). */
export const readIdentityInputSchema = z.object({}).optional();

/** Recompute input — owner-only. `reason` is audited if provided. */
export const recomputeIdentityInputSchema = z.object({
  reason: z.string().min(1).max(280).nullable().optional(),
});

export type RecomputeIdentityInput = z.infer<typeof recomputeIdentityInputSchema>;

export interface RollingWindowsDTO {
  window30d: number;
  window90d: number;
  window180d: number;
  observedDays: number;
}

export interface IdentityStateDTO {
  currentLevel: KhalilIdentityLevel;
  currentScore: number;
  windows: RollingWindowsDTO;
  /** Next level + the gap to its score threshold; null at top. */
  nextThreshold: {
    level: KhalilIdentityLevel;
    minScore: number;
    minObservedDays: number;
    minWindow30d: number;
    minWindow90d: number;
    minWindow180d: number;
  } | null;
  lastComputedAt: string;
  updatedAt: string;
}

export interface IdentityEventRow {
  id: string;
  fromLevel: KhalilIdentityLevel;
  toLevel: KhalilIdentityLevel;
  score: number;
  windows: RollingWindowsDTO;
  reason: string | null;
  createdAt: string;
}
