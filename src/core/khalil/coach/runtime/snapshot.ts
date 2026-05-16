/**
 * Khalil — Coach runtime snapshot (P2.6 §4).
 *
 * Pure shape definition for the allowlisted server-side snapshot the
 * prompt builder consumes. NEVER includes raw chat, free-form journals,
 * cross-domain data, or hidden analytics.
 */
import type { RecoveryMode } from "../../recovery/schemas"; // khalil-governance-allow: rule-2 (ADR-2026-P2.8-01: shared primitives pending extraction)
import type { KhalilIdentityLevel } from "../../identity/runtime/config"; // khalil-governance-allow: rule-2 (ADR-2026-P2.8-01: shared primitives pending extraction)
import type { CoachProposalKind } from "../schemas";

export interface CoachSnapshot {
  userId: string;
  localDate: string;
  identityLevel: KhalilIdentityLevel;
  recovery: RecoveryMode;
  adherence: {
    combinedScore: number;
    prayerScore: number;
    habitScore: number;
  };
  activePillars: ReadonlyArray<"prayer" | "habit" | "recovery">;
  recentProposalKinds: ReadonlyArray<CoachProposalKind>;
}
