/**
 * Khalil — Adaptive difficulty (P3.2).
 *
 * PURE. Filters + rescales mission candidates based on recovery, identity
 * level, and recent failure markers. Protects the user from overload and
 * unlocks escalation only when earned.
 */
import type {
  MissionCandidate,
} from "./scoring";
import type {
  MissionInputs,
  MissionIntensity,
  MissionType,
} from "./contracts";
import { LEVEL_INDEX } from "../identity/runtime/config";

const FORBIDDEN_UNDER_HARD: ReadonlySet<MissionType> = new Set([
  "resilience_push",
  "body_rebuild",
  "deep_focus",
]);

const FORBIDDEN_UNDER_SOFT: ReadonlySet<MissionType> = new Set([
  "resilience_push",
]);

const HIGH_TIER_UNLOCK: ReadonlySet<MissionType> = new Set([
  "resilience_push",
  "deep_focus",
  "identity_proof",
]);

/** Bounded clamp to MissionIntensity. */
function clampIntensity(n: number): MissionIntensity {
  const i = Math.round(n);
  if (i <= 1) return 1;
  if (i >= 5) return 5;
  return i as MissionIntensity;
}

export interface AdaptedCandidate extends MissionCandidate {
  intensity: MissionIntensity;
  /** Mission duration in ms after adaptation. */
  ttlMs: number;
  /** Filter reasons — included in audit if mission would have been dropped. */
  adaptationReasons: string[];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function adaptCandidates(
  input: MissionInputs,
  candidates: readonly MissionCandidate[],
): AdaptedCandidate[] {
  const idx = LEVEL_INDEX[input.identityLevel];
  const out: AdaptedCandidate[] = [];

  for (const c of candidates) {
    const reasons: string[] = [];

    // Recovery filters.
    if (input.recovery === "hard" && FORBIDDEN_UNDER_HARD.has(c.missionType)) {
      continue;
    }
    if (input.recovery === "soft" && FORBIDDEN_UNDER_SOFT.has(c.missionType)) {
      continue;
    }

    // Identity gate.
    if (HIGH_TIER_UNLOCK.has(c.missionType) && idx < LEVEL_INDEX.rising) {
      continue;
    }

    // Base intensity from identity (seed=1 → sovereign=5), then adjustments.
    let intensity = Math.max(1, Math.min(5, idx + 1));

    // Failure downgrade — every 2 recent failures shaves 1 tier.
    const downgrade = Math.floor(input.recentFailures / 2);
    if (downgrade > 0) {
      intensity -= downgrade;
      reasons.push(`failures:${input.recentFailures}`);
    }

    // Recovery softens further.
    if (input.recovery === "soft") {
      intensity -= 1;
      reasons.push("recovery:soft");
    }
    if (input.recovery === "hard") {
      intensity = Math.min(intensity, 2);
      reasons.push("recovery:hard");
    }

    // Consistency streak boosts ONLY non-restful missions.
    if (
      input.activeStreakDays >= 7 &&
      (c.category === "discipline" || c.category === "identity" || c.category === "body")
    ) {
      intensity += 1;
      reasons.push(`streak_boost:${input.activeStreakDays}`);
    }

    const finalIntensity = clampIntensity(intensity);

    // Shorter ttl on lower intensity to favor quick wins.
    const ttlMs =
      finalIntensity <= 2 ? ONE_DAY_MS / 2 :
      finalIntensity === 3 ? ONE_DAY_MS :
      finalIntensity === 4 ? ONE_DAY_MS * 1.5 :
      ONE_DAY_MS * 2;

    out.push({
      ...c,
      intensity: finalIntensity,
      ttlMs,
      adaptationReasons: reasons,
    });
  }

  return out;
}
