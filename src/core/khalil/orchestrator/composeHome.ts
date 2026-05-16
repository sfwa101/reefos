/**
 * Khalil — Home orchestrator (pure runtime, P2.5).
 *
 * Resolves the descriptor tree for `/khalil` based on recovery state,
 * time-of-day, identity level, capabilities, and an adherence summary.
 * Pure TypeScript: no React, no supabase, no I/O.
 *
 * P2.5 upgrade (§9): identity level changes emphasis only — never
 * gates capabilities. Seed users see prayer/habit/recovery first;
 * disciplined/sovereign users see consistency surfaces emphasized
 * and welcome guidance demoted.
 */
import type { RenderBlock, RenderDescriptor } from "@/core/runtime-ui";
import type { RecoveryMode } from "../recovery/schemas";
import type { KhalilIdentityLevel } from "../identity/runtime/config";
import { LEVEL_INDEX } from "../identity/runtime/config";

export interface KhalilAdherenceSummary {
  /** Combined adherence in [0,1] for the local date, server-projected. */
  combinedScore: number;
  /** True when the user has at least one active habit definition. */
  hasActiveHabits: boolean;
}

export interface KhalilHomeContext {
  userId: string;
  /** ISO date in the user's local timezone (yyyy-mm-dd). */
  localDate: string;
  /** Coarse time-of-day bucket — server-computed. */
  timeOfDay: "fajr" | "morning" | "midday" | "afternoon" | "evening" | "night";
  /** Current recovery state — server-truth from `khalil_recovery_state`. */
  recovery: RecoveryMode;
  /** Capability keys the user holds in the active workspace. */
  capabilities: ReadonlySet<string>;
  /** Adherence summary for the local date — server-projected. */
  adherence: KhalilAdherenceSummary;
  /** Identity level — server-truth from `khalil_identity_state`. */
  identityLevel: KhalilIdentityLevel;
  /** Latest pending coach proposal (id + kind only — UI fetches details). */
  pendingCoachProposal?: { id: string; kind: string } | null;
}

interface ScoredBlock {
  block: RenderBlock;
  /** Lower = surface earlier. */
  urgency: number;
  /** Whether to emit at all. Hard recovery hides depth surfaces. */
  visible: boolean;
}

/**
 * Pure urgency scoring (P2.4 §8 + P2.5 §9). Deterministic — same
 * inputs always produce the same score. Identity level only nudges
 * emphasis; never gates blocks.
 */
export function computeUrgencyScore(
  blockKind: string,
  ctx: KhalilHomeContext,
): number {
  const recovery = ctx.recovery;
  const isHard = recovery === "hard";
  const isSoft = recovery === "soft";
  const isFajr = ctx.timeOfDay === "fajr";
  const idx = LEVEL_INDEX[ctx.identityLevel];
  const isElevated = idx >= LEVEL_INDEX.disciplined; // disciplined / sovereign

  switch (blockKind) {
    case "khalil.recovery.banner":
      return -100;
    case "khalil.identity.chip":
      // Always near the top — calm, single-line state surface.
      return -60;
    case "khalil.prayer.today":
      if (isFajr) return -50;
      if (isHard) return -40;
      return -10;
    case "khalil.habit.today":
      if (isHard) return 5;
      if (isSoft) return 0;
      return -5;
    case "khalil.home.welcome":
      // Demote welcome aggressively for elevated identities (P2.5 §9C).
      if (isElevated) return 50;
      if (idx >= LEVEL_INDEX.rising) return 20;
      return 10;
    case "khalil.analytics.heatmap":
    case "khalil.analytics.adherence":
      // Stable / rising see analytics earlier; seed keeps it quiet.
      if (idx >= LEVEL_INDEX.disciplined) return 0;
      if (idx >= LEVEL_INDEX.stable) return 8;
      return 30;
    case "khalil.coach.proposal":
      // Single visible proposal — quiet placement: under identity,
      // above welcome/analytics. Hard recovery softens further.
      if (recovery === "hard") return 40;
      if (idx >= LEVEL_INDEX.disciplined) return 25;
      return -20;
    default:
      return 100;
  }
}

function visibilityFor(
  blockKind: string,
  ctx: KhalilHomeContext,
): boolean {
  if (blockKind === "khalil.recovery.banner") {
    return ctx.recovery !== "off";
  }
  if (ctx.recovery === "hard") {
    if (blockKind === "khalil.analytics.heatmap") return false;
    if (blockKind === "khalil.analytics.adherence") return false;
    if (blockKind === "khalil.workout.next") return false;
    // Hard recovery softens proposal types: only show recovery / quiet kinds.
    if (blockKind === "khalil.coach.proposal") {
      const k = ctx.pendingCoachProposal?.kind;
      if (!k) return false;
      return k === "recovery-suggestion" || k === "quiet-day";
    }
  }
  // P2.5 §9A: seed hides analytics depth (orchestrator-driven only —
  // capabilities are NOT gated by level per p1-capability-ownership).
  if (ctx.identityLevel === "seed") {
    if (blockKind === "khalil.analytics.heatmap") return false;
    if (blockKind === "khalil.analytics.adherence") return false;
  }
  // Coach proposal: only emit when there is an actual pending proposal.
  // Sovereign level reduces guidance noise (§9).
  if (blockKind === "khalil.coach.proposal") {
    if (!ctx.pendingCoachProposal) return false;
    if (ctx.identityLevel === "sovereign") {
      // Sovereign only sees quiet-day / consistency-guidance.
      const k = ctx.pendingCoachProposal.kind;
      return k === "quiet-day" || k === "consistency-guidance";
    }
  }
  return true;
}

export function orderBlocksByUrgency(
  scored: ReadonlyArray<ScoredBlock>,
): RenderBlock[] {
  return [...scored]
    .filter((s) => s.visible)
    .sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency - b.urgency;
      return a.block.kind.localeCompare(b.block.kind);
    })
    .map((s) => s.block);
}

export function composeKhalilHome(ctx: KhalilHomeContext): RenderDescriptor {
  const candidates: RenderBlock[] = [
    {
      kind: "khalil.recovery.banner",
      id: "khalil.recovery.banner",
      props: { mode: ctx.recovery },
    },
    {
      kind: "khalil.identity.chip",
      id: "khalil.identity.chip",
      props: { level: ctx.identityLevel },
    },
    {
      kind: "khalil.home.welcome",
      id: "khalil.home.welcome",
      props: { recovery: ctx.recovery },
    },
    {
      kind: "khalil.prayer.today",
      id: "khalil.prayer.today",
      props: { localDate: ctx.localDate, timeOfDay: ctx.timeOfDay },
    },
    {
      kind: "khalil.habit.today",
      id: "khalil.habit.today",
      props: { localDate: ctx.localDate, recovery: ctx.recovery },
    },
    {
      kind: "khalil.coach.proposal",
      id: "khalil.coach.proposal",
      props: ctx.pendingCoachProposal
        ? {
            proposalId: ctx.pendingCoachProposal.id,
            kind: ctx.pendingCoachProposal.kind,
          }
        : {},
    },
    { kind: "khalil.workout.next", id: "khalil.workout.next", props: { recovery: ctx.recovery } },
    { kind: "khalil.weight.trend", id: "khalil.weight.trend", props: {} },
    { kind: "khalil.analytics.adherence", id: "khalil.analytics.adherence", props: {} },
    { kind: "khalil.analytics.heatmap", id: "khalil.analytics.heatmap", props: {} },
  ];

  const scored: ScoredBlock[] = candidates.map((block) => ({
    block,
    urgency: computeUrgencyScore(block.kind, ctx),
    visible: visibilityFor(block.kind, ctx),
  }));

  const ordered = orderBlocksByUrgency(scored);

  return {
    context: {
      surface: "khalil.home",
      localDate: ctx.localDate,
      timeOfDay: ctx.timeOfDay,
      recovery: ctx.recovery,
      identityLevel: ctx.identityLevel,
      combinedScore: ctx.adherence.combinedScore,
    },
    blocks: ordered,
  };
}
