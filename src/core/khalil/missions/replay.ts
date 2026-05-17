/**
 * Khalil — Mission replay helpers (P3.2).
 *
 * PURE. Recomposes the daily journey + missions from the same input
 * bundle. Used by replay infrastructure to verify byte-identical output.
 */
import type {
  DailyJourney,
  MissionInputs,
  MissionProposal,
} from "./contracts";
import { composeDailyJourney } from "./engine";
import { planMissions } from "./planner";

export interface MissionReplayResult {
  journey: DailyJourney;
  missions: MissionProposal[];
  /** Stable digest of (journey + missions) for drift detection. */
  digest: string;
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function replayMissions(input: MissionInputs): MissionReplayResult {
  const missions = planMissions(input);
  const journey = composeDailyJourney(input);
  const serialized = JSON.stringify({
    j: journey,
    m: missions.map((m) => ({ id: m.id, sk: m.stableKey, i: m.intensity, t: m.missionType })),
  });
  return { journey, missions, digest: fnv1a(serialized) };
}
