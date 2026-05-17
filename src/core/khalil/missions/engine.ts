/**
 * Khalil — Daily Journey composer (P3.2).
 *
 * PURE orchestrator. Same `MissionInputs` → byte-identical journey.
 */
import type {
  DailyJourney,
  MissionInputs,
} from "./contracts";
import { planMissions } from "./planner";
import { pickPrimary, pickSecondary } from "./selectors";
import { LEVEL_INDEX } from "../identity/runtime/config";

function emphasis(score: number): "low" | "medium" | "high" {
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function digestJourneyInputs(input: MissionInputs): string {
  return fnv1a(
    [
      input.userId,
      input.localDate,
      input.identityLevel,
      input.identityScore.toFixed(4),
      input.recovery,
      input.recentFailures,
      input.activeStreakDays,
      input.intelligence.inputsDigest,
    ].join("|"),
  );
}

export function composeDailyJourney(input: MissionInputs): DailyJourney {
  const missions = planMissions(input);
  const primary = pickPrimary(missions);
  const secondary = pickSecondary(missions);
  const intel = input.intelligence;

  const prayerRisk = intel.signals.find((s) => s.key === "prayer_streak_risk")?.score ?? 0;
  const burnout = intel.signals.find((s) => s.key === "burnout_risk")?.score ?? 0;
  const overtrain = intel.signals.find((s) => s.key === "overtraining_risk")?.score ?? 0;
  const lowSleep = intel.signals.find((s) => s.key === "low_sleep_recovery")?.score ?? 0;
  const momentum = intel.signals.find((s) => s.key === "momentum_gain")?.score ?? 0;
  const surge = intel.signals.find((s) => s.key === "consistency_surge")?.score ?? 0;

  const idx = LEVEL_INDEX[input.identityLevel];

  const recoveryScore =
    input.recovery === "hard" ? 90 : input.recovery === "soft" ? 60 : Math.max(burnout, lowSleep);
  const bodyScore =
    input.recovery === "hard" ? 5 :
    input.recovery === "soft" ? 25 :
    Math.max(0, 70 - overtrain);
  const focusScore = idx >= LEVEL_INDEX.rising ? 60 : 25;

  const supportingHabitFocus: DailyJourney["supportingHabitFocus"] =
    prayerRisk >= 60
      ? "spiritual"
      : recoveryScore >= 65
        ? "rest"
        : surge >= 60 || momentum >= 60
          ? "consistency"
          : idx >= LEVEL_INDEX.rising
            ? "discipline"
            : "spiritual";

  const protections: string[] = [];
  if (input.recovery === "hard") protections.push("no_high_intensity_today");
  if (input.recovery !== "off") protections.push("no_secondary_body_load");
  if (input.recentFailures >= 4) protections.push("auto_downgrade_intensity");
  if (overtrain >= 60) protections.push("forbid_volume_spike");

  const rationaleKey =
    input.recovery === "hard"
      ? "khalil.mission.journey.rationale.deep_recovery"
      : prayerRisk >= 60
        ? "khalil.mission.journey.rationale.protect_spiritual"
        : burnout >= 55
          ? "khalil.mission.journey.rationale.calm_load"
          : surge >= 70
            ? "khalil.mission.journey.rationale.celebrate_streak"
            : "khalil.mission.journey.rationale.steady_pace";

  return {
    generatedAt: input.now,
    localDate: input.localDate,
    inputsDigest: digestJourneyInputs(input),
    primaryMission: primary,
    secondaryMission: secondary,
    supportingHabitFocus,
    prayerEmphasis: emphasis(prayerRisk),
    recoveryEmphasis: emphasis(recoveryScore),
    bodyEmphasis: emphasis(bodyScore),
    focusEmphasis: emphasis(focusScore),
    antiOverloadProtections: protections,
    rationaleKey,
  };
}
