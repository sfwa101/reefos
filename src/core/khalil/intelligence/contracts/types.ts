/**
 * Khalil — Sovereign Intelligence Layer contracts (P3.1).
 *
 * Every type here is wire-level and replay-safe. The engines that build
 * these values are PURE — no randomness, no clock, no I/O. The server
 * captures `generatedAt` once and threads it into every computed record
 * so two replays over the same event log produce byte-identical output.
 */
import type { KhalilIdentityLevel } from "../../identity/runtime/config";
import type { RecoveryMode } from "../../recovery/schemas";

export const SOVEREIGN_SIGNAL_KEYS = [
  "prayer_streak_risk",
  "recovery_instability",
  "discipline_growth",
  "burnout_risk",
  "weight_plateau",
  "momentum_gain",
  "identity_alignment",
  "low_sleep_recovery",
  "overtraining_risk",
  "consistency_surge",
] as const;
export type SovereignSignalKey = (typeof SOVEREIGN_SIGNAL_KEYS)[number];

export type SignalSeverity = "low" | "medium" | "high";

export interface SovereignSignal {
  key: SovereignSignalKey;
  /** Normalized 0..100. */
  score: number;
  /** Confidence in [0,1] reflecting observed-day coverage. */
  confidence: number;
  severity: SignalSeverity;
  /** i18n key — UI translates via kt(). */
  explanationKey: string;
  generatedAt: string;
}

export const PRIORITY_PILLARS = [
  "khalil.recovery.banner",
  "khalil.identity.chip",
  "khalil.intelligence.signal",
  "khalil.intelligence.nudge",
  "khalil.intelligence.focus",
  "khalil.prayer.today",
  "khalil.habit.today",
  "khalil.coach.proposal",
  "khalil.workout.next",
  "khalil.weight.trend",
  "khalil.analytics.adherence",
  "khalil.analytics.heatmap",
  "khalil.home.welcome",
] as const;
export type PriorityPillarKey = (typeof PRIORITY_PILLARS)[number];

export interface PriorityScore {
  blockKind: PriorityPillarKey;
  /** Lower = earlier. Deterministic from inputs only. */
  weight: number;
  /** Reason tags (signal keys / state) for audit/replay. */
  reasons: string[];
}

export const NUDGE_KINDS = [
  "protect_prayer_streak",
  "reduce_workout_intensity",
  "recovery_day_recommended",
  "sleep_earlier_tonight",
  "momentum_maintain",
  "consistency_celebration",
  "weight_plateau_steady",
] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];

export interface NudgeProposal {
  id: string;
  kind: NudgeKind;
  /** i18n key for body copy. */
  bodyKey: string;
  /** i18n key for title chip. */
  titleKey: string;
  /** Source signal keys this nudge derives from — auditable. */
  sourceSignals: SovereignSignalKey[];
  severity: SignalSeverity;
  /** ISO timestamp — set by server `generatedAt`. */
  generatedAt: string;
  /** ISO timestamp — server-derived (generatedAt + ttl). */
  expiresAt: string;
}

export const FOCUS_AREAS = [
  "spiritual",
  "habits",
  "body",
  "recovery",
  "rest",
  "consistency",
] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export interface WeeklyFocusPlan {
  primaryFocus: FocusArea;
  secondaryFocus: FocusArea;
  recoveryEmphasis: "low" | "medium" | "high";
  spiritualEmphasis: "low" | "medium" | "high";
  bodyEmphasis: "low" | "medium" | "high";
  forbiddenOverloads: FocusArea[];
  rationaleKey: string;
  generatedAt: string;
}

/**
 * Inputs into the intelligence layer. All fields are projection-derived.
 * `now` is the single source of time so the engine remains deterministic.
 */
export interface IntelligenceInputs {
  /** ISO timestamp — captured once by the server, threaded everywhere. */
  now: string;
  identityLevel: KhalilIdentityLevel;
  identityScore: number;
  recovery: RecoveryMode;
  /** Last 14 daily combined adherence scores (oldest first), 0..1. */
  adherence14d: number[];
  /** Last 14 prayer adherence scores (oldest first), 0..1. */
  prayer14d: number[];
  /** Last 14 habit adherence scores (oldest first), 0..1. */
  habit14d: number[];
  /** Weight projection (kg) — optional. */
  weight?: {
    latestKg: number | null;
    avg7d: number | null;
    avg30d: number | null;
    delta7d: number | null;
    delta30d: number | null;
  };
  /** Last 14 days workout volume (kg total) — sparse zeros allowed. */
  workoutVolume14d: number[];
  /** Pending coach proposal kind, if any (read-only — never mutated here). */
  pendingCoachProposalKind: string | null;
}

export interface IntelligenceSnapshot {
  generatedAt: string;
  replayVersion: number;
  identityLevel: KhalilIdentityLevel;
  recovery: RecoveryMode;
  signals: SovereignSignal[];
  priorities: PriorityScore[];
  nudges: NudgeProposal[];
  weeklyFocus: WeeklyFocusPlan;
  /** Stable digest of the inputs — used for replay drift detection. */
  inputsDigest: string;
}

export const INTELLIGENCE_REPLAY_VERSION = 1;
