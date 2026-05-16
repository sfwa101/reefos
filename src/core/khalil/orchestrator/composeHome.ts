/**
 * Khalil — Home orchestrator (pure runtime, P2.4).
 *
 * Resolves the descriptor tree for `/khalil` based on recovery state,
 * time-of-day, capabilities, and an adherence summary. Pure TypeScript:
 * no React, no supabase, no I/O. Consumed by the server fn wrapper in
 * `composeHome.functions.ts`.
 *
 * Per p1-composable-dashboard.md the home is a descriptor tree, NEVER a
 * bespoke page. Per P2.4 the ordering is deterministic + server-owned.
 */
import type { RenderBlock, RenderDescriptor } from "@/core/runtime-ui";
import type { RecoveryMode } from "../recovery/schemas";

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
}

interface ScoredBlock {
  block: RenderBlock;
  /** Lower = surface earlier. */
  urgency: number;
  /** Whether to emit at all. Hard recovery hides depth surfaces. */
  visible: boolean;
}

/**
 * Pure urgency scoring (P2.4 §8). Returns a finite number; lower numbers
 * appear first in the descriptor tree. Deterministic — same inputs always
 * produce the same score.
 */
export function computeUrgencyScore(
  blockKind: string,
  ctx: KhalilHomeContext,
): number {
  const recovery = ctx.recovery;
  const isHard = recovery === "hard";
  const isSoft = recovery === "soft";
  const isNight = ctx.timeOfDay === "night";
  const isFajr = ctx.timeOfDay === "fajr";
  const lowAdh = ctx.adherence.combinedScore < 0.4;

  switch (blockKind) {
    case "khalil.recovery.banner":
      // Always first when present; banner visibility decided by recovery state.
      return -100;
    case "khalil.prayer.today":
      // Promote prayer before Fajr or in hard recovery (calm anchor).
      if (isFajr) return -50;
      if (isHard) return -40;
      return -10;
    case "khalil.habit.today":
      // Hard recovery → keep visible but never above prayer.
      if (isHard) return 5;
      if (isSoft) return 0;
      return -5;
    case "khalil.home.welcome":
      // Welcome demotes once real pillars exist; stays in soft/hard for tone.
      return 10;
    default:
      // Unknown blocks render last; deterministic tiebreaker is alphabetical.
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
  // Hard recovery hides analytics depth + workout emphasis. Those blocks
  // don't exist yet in P2.4 — guard remains in place for future pillars.
  if (ctx.recovery === "hard") {
    if (blockKind === "khalil.analytics.heatmap") return false;
    if (blockKind === "khalil.analytics.adherence") return false;
    if (blockKind === "khalil.workout.next") return false;
  }
  return true;
}

/** Deterministic ordering used by the resolver and exercised by tests. */
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
  // Candidate block set — descriptor-only. P2.4 keeps the catalog tight;
  // each future pillar (workout, weight, analytics, coach) adds an entry.
  const candidates: RenderBlock[] = [
    {
      kind: "khalil.recovery.banner",
      id: "khalil.recovery.banner",
      props: { mode: ctx.recovery },
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
      combinedScore: ctx.adherence.combinedScore,
    },
    blocks: ordered,
  };
}
