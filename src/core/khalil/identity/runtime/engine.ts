/**
 * Khalil — Identity engine (pure runtime, P2.5).
 *
 * Mirrors the SQL function `khalil_recompute_identity`. Both surfaces
 * MUST stay in lock-step. Used by:
 *   - replay jobs (rebuild projections + events from adherence)
 *   - unit tests
 *
 * Server-only by convention (imported by gateways / replay).
 * Pure TS: no React, no Supabase, no I/O.
 */
import {
  LEVEL_INDEX,
  LEVEL_THRESHOLDS,
  RECOVERY_SOFTENING,
  WINDOW_WEIGHTS,
  levelByIndex,
  type KhalilIdentityLevel,
} from "./config";
import type { RecoveryMode } from "../../recovery/schemas"; // khalil-governance-allow: rule-2 (ADR-2026-P2.8-01: shared primitives pending extraction)

export interface AdherenceDay {
  /** yyyy-mm-dd (UTC, calendar). */
  date: string;
  /** Combined adherence in [0,1]. */
  combinedScore: number;
}

export interface RollingWindows {
  window30d: number;
  window90d: number;
  window180d: number;
  observedDays: number;
}

export interface IdentityComputation {
  windows: RollingWindows;
  score: number;
  level: KhalilIdentityLevel;
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function daysAgoIso(today: string, daysBack: number): string {
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

/** Pure rolling-window averages over `[today - N days, today]`. */
export function computeRollingWindows(
  days: ReadonlyArray<AdherenceDay>,
  today: string,
): RollingWindows {
  const cutoff30  = daysAgoIso(today, 30);
  const cutoff90  = daysAgoIso(today, 90);
  const cutoff180 = daysAgoIso(today, 180);

  let s30 = 0, n30 = 0;
  let s90 = 0, n90 = 0;
  let s180 = 0, n180 = 0;
  let observed = 0;

  for (const d of days) {
    if (d.date > today) continue;
    if (d.date > cutoff180) {
      s180 += d.combinedScore; n180 += 1;
      if (d.combinedScore > 0) observed += 1;
      if (d.date > cutoff90)  { s90  += d.combinedScore; n90  += 1; }
      if (d.date > cutoff30)  { s30  += d.combinedScore; n30  += 1; }
    }
  }

  return {
    window30d:  round4(n30  ? s30  / n30  : 0),
    window90d:  round4(n90  ? s90  / n90  : 0),
    window180d: round4(n180 ? s180 / n180 : 0),
    observedDays: observed,
  };
}

/** Weighted blend + recovery softening. Capped at 1.0. */
export function computeIdentityScore(
  w: RollingWindows,
  recovery: RecoveryMode,
): number {
  const blend =
    w.window30d  * WINDOW_WEIGHTS.w30 +
    w.window90d  * WINDOW_WEIGHTS.w90 +
    w.window180d * WINDOW_WEIGHTS.w180;
  const soften = RECOVERY_SOFTENING[recovery] ?? 1;
  return round4(clamp01(blend * soften));
}

/** Deterministic level resolution from score + windows + observation days. */
export function resolveIdentityLevel(
  score: number,
  windows: RollingWindows,
): KhalilIdentityLevel {
  let resolved: KhalilIdentityLevel = "seed";
  for (const t of LEVEL_THRESHOLDS) {
    if (score >= t.minScore
      && windows.observedDays >= t.minObservedDays
      && windows.window30d  >= t.minWindow30d
      && windows.window90d  >= t.minWindow90d
      && windows.window180d >= t.minWindow180d) {
      resolved = t.level;
    }
  }
  return resolved;
}

/**
 * Apply MVP evolution rules to a *raw* resolved level given the previous
 * level + active recovery mode. Returns the level to persist.
 *
 *   - never jump more than one level up at a time
 *   - hard recovery alone cannot demote (level holds)
 */
export function shouldEvolveIdentity(args: {
  previous: KhalilIdentityLevel;
  resolved: KhalilIdentityLevel;
  recovery: RecoveryMode;
}): { level: KhalilIdentityLevel; transitioned: boolean } {
  const prevIdx = LEVEL_INDEX[args.previous];
  const resIdx  = LEVEL_INDEX[args.resolved];

  let nextIdx = resIdx;
  if (nextIdx > prevIdx + 1) nextIdx = prevIdx + 1;

  if (args.recovery === "hard" && nextIdx < prevIdx) {
    nextIdx = prevIdx;
  }

  const next = levelByIndex(nextIdx);
  return { level: next, transitioned: next !== args.previous };
}

/** Single entrypoint — used by replay + tests. */
export function computeIdentity(args: {
  days: ReadonlyArray<AdherenceDay>;
  today: string;
  recovery: RecoveryMode;
  previousLevel: KhalilIdentityLevel;
}): IdentityComputation & { transitioned: boolean } {
  const windows = computeRollingWindows(args.days, args.today);
  const score = computeIdentityScore(windows, args.recovery);
  const resolved = resolveIdentityLevel(score, windows);
  const evo = shouldEvolveIdentity({
    previous: args.previousLevel,
    resolved,
    recovery: args.recovery,
  });
  return { windows, score, level: evo.level, transitioned: evo.transitioned };
}
