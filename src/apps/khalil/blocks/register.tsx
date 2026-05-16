/**
 * Khalil — block registry boot.
 */
import { blockRegistry } from "@/core/runtime-ui";
import type { RecoveryMode } from "@/core/khalil";
import { KhalilWelcomeBlock } from "./WelcomeBlock";
import { PrayerTodayBlock } from "./PrayerTodayBlock";
import { HabitTodayBlock } from "./HabitTodayBlock";
import { RecoveryBannerBlock } from "./RecoveryBannerBlock";
import { IdentityChipBlock } from "./IdentityChipBlock";
import { CoachProposalBlock } from "./CoachProposalBlock";
import { WorkoutNextBlock } from "./WorkoutNextBlock";
import { WeightTrendBlock } from "./WeightTrendBlock";
import {
  AnalyticsHeatmapBlock,
  AnalyticsAdherenceBlock,
} from "./AnalyticsBlocks";
import {
  CriticalSignalBlock,
  NudgeBlock,
  WeeklyFocusBlock,
} from "./IntelligenceBlocks";

let registered = false;

export function registerKhalilBlocks(): void {
  if (registered) return;
  blockRegistry.register("khalil.home.welcome", () => <KhalilWelcomeBlock />);
  blockRegistry.register("khalil.prayer.today", () => <PrayerTodayBlock />);
  blockRegistry.register("khalil.habit.today", () => <HabitTodayBlock />);
  blockRegistry.register("khalil.recovery.banner", ({ block }) => (
    <RecoveryBannerBlock
      mode={(block.props as { mode?: RecoveryMode } | undefined)?.mode}
    />
  ));
  blockRegistry.register("khalil.identity.chip", () => <IdentityChipBlock />);
  blockRegistry.register("khalil.coach.proposal", () => <CoachProposalBlock />);
  blockRegistry.register("khalil.workout.next", () => <WorkoutNextBlock />);
  blockRegistry.register("khalil.weight.trend", () => <WeightTrendBlock />);
  blockRegistry.register("khalil.analytics.heatmap", () => <AnalyticsHeatmapBlock />);
  blockRegistry.register("khalil.analytics.adherence", () => <AnalyticsAdherenceBlock />);
  blockRegistry.register("khalil.intelligence.signal", ({ block }) => {
    const p = (block.props ?? {}) as {
      signalKey?: string;
      severity?: "low" | "medium" | "high";
      score?: number;
      explanationKey?: string;
    };
    if (!p.signalKey || !p.explanationKey) return null;
    return (
      <CriticalSignalBlock
        signalKey={p.signalKey}
        severity={p.severity ?? "low"}
        score={p.score ?? 0}
        explanationKey={p.explanationKey}
      />
    );
  });
  blockRegistry.register("khalil.intelligence.nudge", ({ block }) => {
    const p = (block.props ?? {}) as {
      nudgeId?: string;
      kind?: string;
      titleKey?: string;
      bodyKey?: string;
      severity?: "low" | "medium" | "high";
    };
    if (!p.nudgeId || !p.titleKey || !p.bodyKey || !p.kind) return null;
    return (
      <NudgeBlock
        nudgeId={p.nudgeId}
        kind={p.kind}
        titleKey={p.titleKey}
        bodyKey={p.bodyKey}
        severity={p.severity ?? "low"}
      />
    );
  });
  blockRegistry.register("khalil.intelligence.focus", ({ block }) => {
    const p = (block.props ?? {}) as {
      primaryFocus?: string;
      secondaryFocus?: string;
      rationaleKey?: string;
      spiritualEmphasis?: string;
      bodyEmphasis?: string;
      recoveryEmphasis?: string;
    };
    if (!p.primaryFocus || !p.secondaryFocus || !p.rationaleKey) return null;
    return (
      <WeeklyFocusBlock
        primaryFocus={p.primaryFocus}
        secondaryFocus={p.secondaryFocus}
        rationaleKey={p.rationaleKey}
        spiritualEmphasis={p.spiritualEmphasis ?? "low"}
        bodyEmphasis={p.bodyEmphasis ?? "low"}
        recoveryEmphasis={p.recoveryEmphasis ?? "low"}
      />
    );
  });
  registered = true;
}
