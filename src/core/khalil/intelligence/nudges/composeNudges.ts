/**
 * Khalil — Nudge engine (P3.1).
 *
 * PURE. Builds short, explainable nudges from signals. Never manipulative,
 * never fear-driven (see ai-coach-philosophy.md). Each nudge cites the
 * source signals so audits can reconstruct WHY it was shown.
 *
 * IDs are derived from inputs (signal keys + generatedAt) so the same
 * snapshot replays to the same nudge ids — no random UUIDs.
 */
import type {
  IntelligenceInputs,
  NudgeKind,
  NudgeProposal,
  SignalSeverity,
  SovereignSignal,
  SovereignSignalKey,
} from "../contracts/types";
import { indexSignals } from "../signals/computeSignals";

const NUDGE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const MAX_NUDGES = 3;

function deterministicId(kind: NudgeKind, generatedAt: string): string {
  // FNV-1a 32-bit — deterministic, no Math.random.
  const s = `${kind}|${generatedAt}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `nudge_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function maxSeverity(s: SignalSeverity[]): SignalSeverity {
  if (s.includes("high")) return "high";
  if (s.includes("medium")) return "medium";
  return "low";
}

interface NudgeCandidate {
  kind: NudgeKind;
  priority: number; // lower = stronger
  sources: SovereignSignalKey[];
}

export function composeNudgeProposals(
  input: IntelligenceInputs,
  signals: readonly SovereignSignal[],
): NudgeProposal[] {
  const map = indexSignals(signals);
  const candidates: NudgeCandidate[] = [];

  const recoveryInstability = map.get("recovery_instability");
  const burnout = map.get("burnout_risk");
  const overtraining = map.get("overtraining_risk");
  const lowSleep = map.get("low_sleep_recovery");
  const prayerRisk = map.get("prayer_streak_risk");
  const momentum = map.get("momentum_gain");
  const surge = map.get("consistency_surge");
  const plateau = map.get("weight_plateau");

  if (recoveryInstability && recoveryInstability.score >= 55) {
    candidates.push({
      kind: "recovery_day_recommended",
      priority: 0,
      sources: ["recovery_instability"],
    });
  }
  if ((burnout && burnout.score >= 60) || (overtraining && overtraining.score >= 60)) {
    candidates.push({
      kind: "reduce_workout_intensity",
      priority: 1,
      sources: ["burnout_risk", "overtraining_risk"].filter((k) =>
        map.has(k as SovereignSignalKey),
      ) as SovereignSignalKey[],
    });
  }
  if (lowSleep && lowSleep.score >= 50) {
    candidates.push({
      kind: "sleep_earlier_tonight",
      priority: 2,
      sources: ["low_sleep_recovery"],
    });
  }
  if (prayerRisk && prayerRisk.score >= 55) {
    candidates.push({
      kind: "protect_prayer_streak",
      priority: 3,
      sources: ["prayer_streak_risk"],
    });
  }
  if (surge && surge.score >= 70) {
    candidates.push({
      kind: "consistency_celebration",
      priority: 5,
      sources: ["consistency_surge"],
    });
  }
  if (momentum && momentum.score >= 60) {
    candidates.push({
      kind: "momentum_maintain",
      priority: 6,
      sources: ["momentum_gain"],
    });
  }
  if (plateau && plateau.score >= 60) {
    candidates.push({
      kind: "weight_plateau_steady",
      priority: 8,
      sources: ["weight_plateau"],
    });
  }

  candidates.sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : a.kind.localeCompare(b.kind),
  );

  const generatedAt = input.now;
  const expiresAt = new Date(Date.parse(generatedAt) + NUDGE_TTL_MS).toISOString();

  return candidates.slice(0, MAX_NUDGES).map((c) => {
    const severities = c.sources
      .map((k) => map.get(k)?.severity)
      .filter((s): s is SignalSeverity => Boolean(s));
    return {
      id: deterministicId(c.kind, generatedAt),
      kind: c.kind,
      titleKey: `khalil.intelligence.nudge.${c.kind}.title`,
      bodyKey: `khalil.intelligence.nudge.${c.kind}.body`,
      sourceSignals: c.sources,
      severity: maxSeverity(severities),
      generatedAt,
      expiresAt,
    };
  });
}
