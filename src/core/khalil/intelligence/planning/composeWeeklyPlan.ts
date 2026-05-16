/**
 * Khalil — Weekly Focus Planner (P3.1).
 *
 * PURE. Builds a structured plan from 14d projections + identity +
 * recovery. No generative text — only structured fields the UI maps to
 * kt() keys.
 */
import type {
  FocusArea,
  IntelligenceInputs,
  SovereignSignal,
  WeeklyFocusPlan,
} from "../contracts/types";
import { indexSignals } from "../signals/computeSignals";
import { LEVEL_INDEX } from "../../identity/runtime/config";

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += Number.isFinite(x) ? x : 0;
  return s / xs.length;
}

export function composeWeeklyFocus(
  input: IntelligenceInputs,
  signals: readonly SovereignSignal[],
): WeeklyFocusPlan {
  const map = indexSignals(signals);
  const idx = LEVEL_INDEX[input.identityLevel];
  const recovery = input.recovery;

  const prayerMean = mean(input.prayer14d.slice(-7));
  const habitMean = mean(input.habit14d.slice(-7));

  let primary: FocusArea = "consistency";
  let secondary: FocusArea = "habits";
  const forbidden: FocusArea[] = [];

  if (recovery === "hard") {
    primary = "recovery";
    secondary = "rest";
    forbidden.push("body");
  } else if ((map.get("recovery_instability")?.score ?? 0) >= 55) {
    primary = "recovery";
    secondary = "spiritual";
    forbidden.push("body");
  } else if (prayerMean < 0.5) {
    primary = "spiritual";
    secondary = "habits";
  } else if ((map.get("burnout_risk")?.score ?? 0) >= 60) {
    primary = "rest";
    secondary = "spiritual";
    forbidden.push("body");
  } else if (habitMean < 0.4) {
    primary = "habits";
    secondary = "spiritual";
  } else if (idx >= LEVEL_INDEX.disciplined) {
    primary = "body";
    secondary = "consistency";
  } else if (idx >= LEVEL_INDEX.rising) {
    primary = "consistency";
    secondary = "body";
  }

  const spiritualEmphasis =
    prayerMean < 0.5 ? "high" : prayerMean < 0.75 ? "medium" : "low";
  const recoveryEmphasis =
    recovery === "hard" ? "high" : recovery === "soft" ? "medium" : "low";
  const bodyEmphasis =
    forbidden.includes("body")
      ? "low"
      : idx >= LEVEL_INDEX.disciplined
        ? "high"
        : idx >= LEVEL_INDEX.rising
          ? "medium"
          : "low";

  return {
    primaryFocus: primary,
    secondaryFocus: secondary,
    recoveryEmphasis,
    spiritualEmphasis,
    bodyEmphasis,
    forbiddenOverloads: forbidden,
    rationaleKey: `khalil.intelligence.focus.rationale.${primary}`,
    generatedAt: input.now,
  };
}
