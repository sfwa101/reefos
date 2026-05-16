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
  registered = true;
}
