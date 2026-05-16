/**
 * Khalil — Identity engine thresholds (P2.5).
 *
 * Config-backed, deterministic, server-only. Mirrored by
 * `khalil_recompute_identity` SQL function — both surfaces MUST stay in
 * lock-step. Tests in `runtime/__tests__/` lock the math.
 *
 * Locked by ADR-0004 + P2.5 §3/§4.
 */

export const KHALIL_IDENTITY_LEVELS = [
  "seed",
  "stable",
  "rising",
  "disciplined",
  "sovereign",
] as const;

export type KhalilIdentityLevel = (typeof KHALIL_IDENTITY_LEVELS)[number];

export const LEVEL_INDEX: Readonly<Record<KhalilIdentityLevel, number>> =
  Object.freeze({
    seed: 0,
    stable: 1,
    rising: 2,
    disciplined: 3,
    sovereign: 4,
  });

export function levelByIndex(i: number): KhalilIdentityLevel {
  const clamped = Math.max(0, Math.min(KHALIL_IDENTITY_LEVELS.length - 1, i | 0));
  return KHALIL_IDENTITY_LEVELS[clamped];
}

/** Window weights used to fold rolling averages into a single score. */
export const WINDOW_WEIGHTS = Object.freeze({
  w30: 0.5,
  w90: 0.3,
  w180: 0.2,
});

/** Recovery softening multiplier (capped at 1.0 score). */
export const RECOVERY_SOFTENING = Object.freeze({
  off: 1.0,
  soft: 1.05,
  hard: 1.15,
});

export interface LevelThreshold {
  readonly level: KhalilIdentityLevel;
  readonly minScore: number;
  readonly minObservedDays: number;
  readonly minWindow30d: number;
  readonly minWindow90d: number;
  readonly minWindow180d: number;
}

/** Ordered ascending. Resolver walks bottom-up and keeps the highest match. */
export const LEVEL_THRESHOLDS: ReadonlyArray<LevelThreshold> = Object.freeze([
  { level: "seed",        minScore: 0.00, minObservedDays: 0,   minWindow30d: 0.00, minWindow90d: 0.00, minWindow180d: 0.00 },
  { level: "stable",      minScore: 0.35, minObservedDays: 14,  minWindow30d: 0.00, minWindow90d: 0.00, minWindow180d: 0.00 },
  { level: "rising",      minScore: 0.55, minObservedDays: 30,  minWindow30d: 0.50, minWindow90d: 0.00, minWindow180d: 0.00 },
  { level: "disciplined", minScore: 0.70, minObservedDays: 60,  minWindow30d: 0.00, minWindow90d: 0.60, minWindow180d: 0.00 },
  { level: "sovereign",   minScore: 0.85, minObservedDays: 120, minWindow30d: 0.00, minWindow90d: 0.00, minWindow180d: 0.70 },
]);
