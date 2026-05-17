/**
 * Khalil — Mission planner (P3.2).
 *
 * PURE. Converts adapted candidates into final `MissionProposal` records
 * with deterministic ids and stable dedupe keys.
 */
import type {
  MissionInputs,
  MissionProposal,
} from "./contracts";
import { rankMissionCandidates } from "./scoring";
import { adaptCandidates } from "./adaptation";

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function stableKeyFor(input: MissionInputs, missionType: string): string {
  const base = `${input.userId}|${input.localDate}|${missionType}`;
  return `m_${fnv1a(base)}`;
}

function deterministicId(stableKey: string, snapshotDigest: string): string {
  return `mid_${fnv1a(`${stableKey}|${snapshotDigest}`)}`;
}

export function planMissions(input: MissionInputs): MissionProposal[] {
  const candidates = rankMissionCandidates(input);
  const adapted = adaptCandidates(input, candidates);

  return adapted.map((c) => {
    const stableKey = stableKeyFor(input, c.missionType);
    const id = deterministicId(stableKey, input.intelligence.inputsDigest);
    return {
      id,
      stableKey,
      missionType: c.missionType,
      category: c.category,
      intensity: c.intensity,
      titleKey: `khalil.mission.${c.missionType}.title`,
      bodyKey: `khalil.mission.${c.missionType}.body`,
      generatedFromSnapshot: input.intelligence.inputsDigest,
      ttlMs: c.ttlMs,
      rationale: [...c.rationale, ...c.adaptationReasons],
    };
  });
}
