/**
 * Khalil — Mission selectors (P3.2).
 *
 * PURE selectors over a planned mission list. The orchestrator uses
 * `pickPrimary` / `pickSecondary` to inject home blocks deterministically.
 */
import type { MissionProposal } from "./contracts";

export function pickPrimary(missions: readonly MissionProposal[]): MissionProposal | null {
  return missions.length > 0 ? missions[0] : null;
}

export function pickSecondary(
  missions: readonly MissionProposal[],
): MissionProposal | null {
  const primary = missions[0];
  if (!primary) return null;
  for (const m of missions.slice(1)) {
    if (m.category !== primary.category) return m;
  }
  return null;
}
