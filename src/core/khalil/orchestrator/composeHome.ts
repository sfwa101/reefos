/**
 * Khalil — Home orchestrator (pure runtime).
 *
 * Resolves which blocks to render on the Khalil home for a given user
 * context. Pure TypeScript: no React, no supabase, no I/O. Consumed by
 * the server fn wrapper in `composeHome.functions.ts`.
 *
 * Per p1-composable-dashboard.md the home is a descriptor tree, NOT a
 * bespoke page. P2.1 ships the resolver shape; full rules (urgency
 * scoring, recovery, time-of-day) land with their owning capabilities.
 */
import type { RenderDescriptor } from "@/core/runtime-ui";

export interface KhalilHomeContext {
  userId: string;
  /** ISO date in the user's local timezone (yyyy-mm-dd). */
  localDate: string;
  /** Coarse time-of-day bucket — server-computed. */
  timeOfDay: "fajr" | "morning" | "midday" | "afternoon" | "evening" | "night";
  /** Recovery state — `off` is the steady-state. */
  recovery: "off" | "soft" | "hard";
  /** Capability keys the user holds in the active workspace. */
  capabilities: ReadonlySet<string>;
}

/**
 * P2.1 minimal compose: a single welcome/scaffold block. As capabilities
 * land in P2.2 they each contribute their block id here (gated by their
 * own capability key) — never by importing from another sub-domain.
 */
export function composeKhalilHome(ctx: KhalilHomeContext): RenderDescriptor {
  return {
    context: {
      surface: "khalil.home",
      localDate: ctx.localDate,
      timeOfDay: ctx.timeOfDay,
      recovery: ctx.recovery,
    },
    blocks: [
      {
        kind: "khalil.home.welcome",
        id: "khalil.home.welcome",
        props: { recovery: ctx.recovery },
      },
    ],
  };
}
