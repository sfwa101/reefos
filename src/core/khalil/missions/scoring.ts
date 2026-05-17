/**
 * Khalil — Mission scoring (P3.2).
 *
 * PURE. Maps intelligence signals + identity/recovery context to a
 * ranked list of mission candidates with deterministic priority.
 */
import type {
  MissionCategory,
  MissionInputs,
  MissionType,
} from "./contracts";
import { LEVEL_INDEX } from "../identity/runtime/config";

export interface MissionCandidate {
  missionType: MissionType;
  category: MissionCategory;
  /** Lower = stronger. */
  priority: number;
  rationale: string[];
}

const CATEGORY_OF: Readonly<Record<MissionType, MissionCategory>> = Object.freeze({
  prayer_recovery: "spiritual",
  discipline_chain: "discipline",
  body_rebuild: "body",
  deep_focus: "focus",
  sleep_repair: "rest",
  dopamine_reset: "rest",
  consistency_guard: "discipline",
  identity_proof: "identity",
  resilience_push: "body",
});

function signalScore(
  intel: MissionInputs["intelligence"],
  key: string,
): number {
  for (const s of intel.signals) if (s.key === key) return s.score;
  return 0;
}

/**
 * Build ALL candidates with raw priority (lower = stronger). Adaptation
 * filters and rescales further. Deterministic — same inputs same output.
 */
export function rankMissionCandidates(input: MissionInputs): MissionCandidate[] {
  const intel = input.intelligence;
  const idx = LEVEL_INDEX[input.identityLevel];
  const prayerRisk = signalScore(intel, "prayer_streak_risk");
  const burnout = signalScore(intel, "burnout_risk");
  const overtraining = signalScore(intel, "overtraining_risk");
  const lowSleep = signalScore(intel, "low_sleep_recovery");
  const surge = signalScore(intel, "consistency_surge");
  const momentum = signalScore(intel, "momentum_gain");
  const growth = signalScore(intel, "discipline_growth");
  const alignment = signalScore(intel, "identity_alignment");

  const out: MissionCandidate[] = [];

  // Recovery / repair family — high urgency under instability.
  if (lowSleep >= 50 || input.recovery === "hard") {
    out.push({
      missionType: "sleep_repair",
      category: "rest",
      priority: 0,
      rationale: ["low_sleep_recovery", `recovery:${input.recovery}`],
    });
  }
  if (burnout >= 55 || overtraining >= 60 || input.recovery === "hard") {
    out.push({
      missionType: "dopamine_reset",
      category: "rest",
      priority: 1,
      rationale: ["burnout_risk", "overtraining_risk"],
    });
  }

  // Spiritual protection.
  if (prayerRisk >= 50) {
    out.push({
      missionType: "prayer_recovery",
      category: "spiritual",
      priority: 2,
      rationale: ["prayer_streak_risk"],
    });
  }

  // Discipline / consistency.
  if (input.activeStreakDays >= 3 || surge >= 60) {
    out.push({
      missionType: "consistency_guard",
      category: "discipline",
      priority: 3,
      rationale: ["consistency_surge", `streak:${input.activeStreakDays}`],
    });
  }
  out.push({
    missionType: "discipline_chain",
    category: "discipline",
    priority: 4 + (growth >= 50 ? -1 : 0),
    rationale: ["discipline_growth"],
  });

  // Body — only when recovery permits.
  if (input.recovery !== "hard") {
    out.push({
      missionType: "body_rebuild",
      category: "body",
      priority: 5 + (overtraining >= 60 ? 5 : 0),
      rationale: ["body_baseline"],
    });
  }

  // Focus.
  if (idx >= LEVEL_INDEX.rising) {
    out.push({
      missionType: "deep_focus",
      category: "focus",
      priority: 6,
      rationale: [`identity:${input.identityLevel}`],
    });
  }

  // Identity proof.
  if (alignment >= 60 || idx >= LEVEL_INDEX.disciplined) {
    out.push({
      missionType: "identity_proof",
      category: "identity",
      priority: 7,
      rationale: ["identity_alignment"],
    });
  }

  // Resilience push — opt-in, gated by momentum + non-soft recovery.
  if (momentum >= 60 && input.recovery === "off" && idx >= LEVEL_INDEX.disciplined) {
    out.push({
      missionType: "resilience_push",
      category: "body",
      priority: 8,
      rationale: ["momentum_gain", `identity:${input.identityLevel}`],
    });
  }

  // Deterministic sort — priority then type name.
  out.sort((a, b) =>
    a.priority !== b.priority
      ? a.priority - b.priority
      : a.missionType.localeCompare(b.missionType),
  );

  // Sanity: every entry's category must match the canonical map.
  for (const c of out) c.category = CATEGORY_OF[c.missionType];
  return out;
}
