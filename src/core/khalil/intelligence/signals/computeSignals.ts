/**
 * Khalil — Sovereign Signals engine (P3.1).
 *
 * PURE. No Date.now, no Math.random, no I/O. Same inputs → same output.
 * Severity buckets are deterministic functions of score; explanation keys
 * are stable i18n identifiers (UI translates via kt()).
 */
import type {
  IntelligenceInputs,
  SignalSeverity,
  SovereignSignal,
  SovereignSignalKey,
} from "../contracts/types";

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += Number.isFinite(x) ? x : 0;
  return s / xs.length;
}

function trend(xs: readonly number[]): number {
  // Difference between last 7d mean and prior 7d mean — bounded [-1,1].
  if (xs.length < 8) return 0;
  const recent = xs.slice(-7);
  const prior = xs.slice(-14, -7);
  const d = mean(recent) - mean(prior);
  return Math.max(-1, Math.min(1, d));
}

function confidenceFor(observed: number): number {
  // 14 days → 1.0, 7 days → ~0.5, 0 days → 0.
  return clamp01(observed / 14);
}

function sevFromScore(score: number): SignalSeverity {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function explain(key: SovereignSignalKey): string {
  return `khalil.intelligence.signal.${key}.explanation`;
}

export function computeSovereignSignals(
  input: IntelligenceInputs,
): SovereignSignal[] {
  const now = input.now;
  const observed = Math.min(14, input.adherence14d.length);
  const conf = confidenceFor(observed);

  const recentPrayer = mean(input.prayer14d.slice(-7));
  const recentHabit = mean(input.habit14d.slice(-7));
  const recentCombined = mean(input.adherence14d.slice(-7));
  const olderCombined = mean(input.adherence14d.slice(-14, -7));
  const combinedTrend = trend(input.adherence14d);
  const prayerTrend = trend(input.prayer14d);

  const recentVolume = mean(input.workoutVolume14d.slice(-7));
  const olderVolume = mean(input.workoutVolume14d.slice(-14, -7));
  const volumeRatio =
    olderVolume > 0
      ? recentVolume / olderVolume
      : recentVolume > 0
        ? 2
        : 1;

  const wDelta7 = input.weight?.delta7d ?? 0;
  const wDelta30 = input.weight?.delta30d ?? 0;

  const out: SovereignSignal[] = [];

  const push = (
    key: SovereignSignalKey,
    rawScore: number,
    confidence: number,
  ): void => {
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    out.push({
      key,
      score,
      confidence: clamp01(confidence),
      severity: sevFromScore(score),
      explanationKey: explain(key),
      generatedAt: now,
    });
  };

  // prayer_streak_risk: high when prayer adherence is falling.
  push(
    "prayer_streak_risk",
    (1 - recentPrayer) * 60 + Math.max(0, -prayerTrend) * 40,
    conf,
  );

  // recovery_instability: hard recovery or sharp drop in combined.
  const recoveryPenalty =
    input.recovery === "hard" ? 70 : input.recovery === "soft" ? 35 : 0;
  push(
    "recovery_instability",
    recoveryPenalty + Math.max(0, olderCombined - recentCombined) * 60,
    conf,
  );

  // discipline_growth: positive combined trend.
  push("discipline_growth", Math.max(0, combinedTrend) * 100, conf);

  // burnout_risk: high volume + falling adherence.
  push(
    "burnout_risk",
    Math.min(100, Math.max(0, (volumeRatio - 1) * 60) +
      Math.max(0, -combinedTrend) * 40),
    conf,
  );

  // weight_plateau: tiny delta over 30d with reasonable data.
  const plateau =
    input.weight?.avg30d != null && Math.abs(wDelta30) < 0.5 ? 70 : 20;
  push("weight_plateau", plateau, input.weight?.avg30d != null ? 0.9 : 0.2);

  // momentum_gain: combined trend high AND recent prayer/habit balanced.
  const balance = 1 - Math.abs(recentPrayer - recentHabit);
  push(
    "momentum_gain",
    Math.max(0, combinedTrend) * 70 + balance * 30,
    conf,
  );

  // identity_alignment: distance of currentScore vs adherence-implied score.
  const alignment = 100 - Math.min(100, Math.abs(input.identityScore - recentCombined * 100));
  push("identity_alignment", alignment, conf);

  // low_sleep_recovery: proxy — recovery=soft|hard signals reduced rest.
  push(
    "low_sleep_recovery",
    input.recovery === "hard" ? 80 : input.recovery === "soft" ? 50 : 15,
    0.5,
  );

  // overtraining_risk: workout volume ratio > 1.4 AND non-off recovery.
  push(
    "overtraining_risk",
    Math.min(100,
      Math.max(0, (volumeRatio - 1.2) * 80) + (input.recovery !== "off" ? 25 : 0)),
    conf,
  );

  // consistency_surge: ≥10 of last 14 days above 0.6.
  const strongDays = input.adherence14d.filter((x) => x >= 0.6).length;
  push("consistency_surge", Math.min(100, (strongDays / 14) * 100), conf);

  return out;
}

export function indexSignals(
  signals: readonly SovereignSignal[],
): ReadonlyMap<SovereignSignalKey, SovereignSignal> {
  const m = new Map<SovereignSignalKey, SovereignSignal>();
  for (const s of signals) m.set(s.key, s);
  return m;
}
