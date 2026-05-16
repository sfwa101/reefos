/**
 * Khalil — block registry boot.
 *
 * Registers `khalil.*` block ids with the shared `blockRegistry` so the
 * RuntimeRenderer can resolve them. Imported once from the Khalil shell.
 * Per Art. IX (kernel minimalism) the shared registry stays domain-agnostic;
 * Khalil registers its own blocks at boot.
 */
import { blockRegistry } from "@/core/runtime-ui";
import type { RecoveryMode } from "@/core/khalil";
import { KhalilWelcomeBlock } from "./WelcomeBlock";
import { PrayerTodayBlock } from "./PrayerTodayBlock";
import { HabitTodayBlock } from "./HabitTodayBlock";
import { RecoveryBannerBlock } from "./RecoveryBannerBlock";
import { IdentityChipBlock } from "./IdentityChipBlock";
import { CoachProposalBlock } from "./CoachProposalBlock";

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
  registered = true;
}
