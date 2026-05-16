/**
 * Khalil — Priority Scoring engine (P3.1).
 *
 * PURE. Deterministic re-ordering of home pillars based on signals,
 * identity, recovery, and pending coach state. Lower weight = earlier.
 *
 * The orchestrator (`composeKhalilHome`) consumes the resulting weights
 * to break ties in its static base ordering. Hard visibility decisions
 * remain in the orchestrator — scoring only RANKS visible blocks.
 */
import type {
  IntelligenceInputs,
  PriorityPillarKey,
  PriorityScore,
  SovereignSignal,
} from "../contracts/types";
import { indexSignals } from "../signals/computeSignals";
import { LEVEL_INDEX } from "../../identity/runtime/config";

const BASE_WEIGHT: Readonly<Record<PriorityPillarKey, number>> = Object.freeze({
  "khalil.recovery.banner": -100,
  "khalil.identity.chip": -60,
  "khalil.intelligence.signal": -55,
  "khalil.intelligence.nudge": -45,
  "khalil.intelligence.focus": -25,
  "khalil.prayer.today": -10,
  "khalil.habit.today": 0,
  "khalil.coach.proposal": -5,
  "khalil.workout.next": 5,
  "khalil.weight.trend": 10,
  "khalil.analytics.adherence": 20,
  "khalil.analytics.heatmap": 25,
  "khalil.home.welcome": 30,
});

export function computePrioritiesFromSignals(
  input: IntelligenceInputs,
  signals: readonly SovereignSignal[],
): PriorityScore[] {
  const map = indexSignals(signals);
  const idx = LEVEL_INDEX[input.identityLevel];
  const result: PriorityScore[] = [];

  for (const kind of Object.keys(BASE_WEIGHT) as PriorityPillarKey[]) {
    let weight = BASE_WEIGHT[kind];
    const reasons: string[] = [];

    const recoveryInstability = map.get("recovery_instability");
    const burnout = map.get("burnout_risk");
    const prayerRisk = map.get("prayer_streak_risk");
    const momentum = map.get("momentum_gain");
    const overtraining = map.get("overtraining_risk");
    const surge = map.get("consistency_surge");

    if (input.recovery === "hard") {
      if (kind === "khalil.workout.next") {
        weight += 200;
        reasons.push("recovery:hard");
      }
      if (kind === "khalil.analytics.heatmap" || kind === "khalil.analytics.adherence") {
        weight += 80;
        reasons.push("recovery:hard");
      }
    }

    if (prayerRisk && prayerRisk.score >= 60 && kind === "khalil.prayer.today") {
      weight -= 40;
      reasons.push("prayer_streak_risk");
    }

    if (recoveryInstability && recoveryInstability.score >= 55) {
      if (kind === "khalil.workout.next") {
        weight += 30;
        reasons.push("recovery_instability");
      }
    }

    if (burnout && burnout.score >= 60 && kind === "khalil.workout.next") {
      weight += 25;
      reasons.push("burnout_risk");
    }

    if (overtraining && overtraining.score >= 60 && kind === "khalil.workout.next") {
      weight += 20;
      reasons.push("overtraining_risk");
    }

    if (momentum && momentum.score >= 60) {
      if (kind === "khalil.analytics.adherence" || kind === "khalil.analytics.heatmap") {
        weight -= 15;
        reasons.push("momentum_gain");
      }
    }

    if (surge && surge.score >= 70 && kind === "khalil.intelligence.focus") {
      weight -= 5;
      reasons.push("consistency_surge");
    }

    // Identity emphasis — sovereign demotes welcome / promotes analytics.
    if (kind === "khalil.home.welcome" && idx >= LEVEL_INDEX.disciplined) {
      weight += 30;
      reasons.push("identity:elevated");
    }
    if (kind === "khalil.analytics.adherence" && idx >= LEVEL_INDEX.disciplined) {
      weight -= 8;
      reasons.push("identity:elevated");
    }

    if (input.pendingCoachProposalKind && kind === "khalil.coach.proposal") {
      weight -= 15;
      reasons.push("coach:pending");
    }

    result.push({ blockKind: kind, weight, reasons });
  }

  // Stable sort by weight then kind for determinism.
  result.sort((a, b) =>
    a.weight !== b.weight
      ? a.weight - b.weight
      : a.blockKind.localeCompare(b.blockKind),
  );
  return result;
}
