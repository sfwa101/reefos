/**
 * Khalil — Intelligence Snapshot composer (P3.1).
 *
 * PURE orchestrator that runs the four engines and produces a single
 * deterministic `IntelligenceSnapshot`. Replay safety property:
 *
 *   composeIntelligenceSnapshot(inputs) === composeIntelligenceSnapshot(inputs)
 *
 * for any equal `inputs`. The server captures one `now` per snapshot
 * and threads it through every record.
 */
import {
  INTELLIGENCE_REPLAY_VERSION,
  type IntelligenceInputs,
  type IntelligenceSnapshot,
} from "../contracts/types";
import { computeSovereignSignals } from "../signals/computeSignals";
import { computePrioritiesFromSignals } from "../scoring/computePriorities";
import { composeNudgeProposals } from "../nudges/composeNudges";
import { composeWeeklyFocus } from "../planning/composeWeeklyPlan";

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function digestInputs(input: IntelligenceInputs): string {
  // Deterministic, ordered serialization — no JSON key reordering.
  const ordered = [
    input.identityLevel,
    input.identityScore.toFixed(4),
    input.recovery,
    input.adherence14d.map((x) => x.toFixed(4)).join(","),
    input.prayer14d.map((x) => x.toFixed(4)).join(","),
    input.habit14d.map((x) => x.toFixed(4)).join(","),
    input.workoutVolume14d.map((x) => x.toFixed(2)).join(","),
    input.weight?.latestKg?.toFixed(2) ?? "_",
    input.weight?.avg7d?.toFixed(2) ?? "_",
    input.weight?.avg30d?.toFixed(2) ?? "_",
    input.weight?.delta7d?.toFixed(3) ?? "_",
    input.weight?.delta30d?.toFixed(3) ?? "_",
    input.pendingCoachProposalKind ?? "_",
  ].join("|");
  return fnv1a(ordered);
}

export function composeIntelligenceSnapshot(
  input: IntelligenceInputs,
): IntelligenceSnapshot {
  const signals = computeSovereignSignals(input);
  const priorities = computePrioritiesFromSignals(input, signals);
  const nudges = composeNudgeProposals(input, signals);
  const weeklyFocus = composeWeeklyFocus(input, signals);

  return {
    generatedAt: input.now,
    replayVersion: INTELLIGENCE_REPLAY_VERSION,
    identityLevel: input.identityLevel,
    recovery: input.recovery,
    signals,
    priorities,
    nudges,
    weeklyFocus,
    inputsDigest: digestInputs(input),
  };
}
