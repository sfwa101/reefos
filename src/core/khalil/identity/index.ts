/**
 * Khalil — Identity engine scaffolding (P2.3).
 *
 * SCAFFOLDING ONLY. Level transition mechanics, evolution rules, and
 * the AI coach hook are explicitly out of P2.3 scope (see request §1).
 *
 * This module pins:
 *   - the level ladder shape
 *   - the input contract (server-attested signals only)
 *   - a deterministic `previewIdentityLevel` stub that returns "seed"
 *     until the real engine lands with its own ADR (ADR-K001).
 *
 * UI never imports this in P2.3. Future blocks read identity via a
 * dedicated server-fn (`khalil.identity.read`) that wraps this engine.
 */
export const KHALIL_IDENTITY_LEVELS = [
  "seed",
  "sprout",
  "branch",
  "tree",
  "forest",
] as const;
export type KhalilIdentityLevel = (typeof KHALIL_IDENTITY_LEVELS)[number];

export interface IdentitySignals {
  /** 30-day rolling combined adherence in [0..1]. */
  combinedAdherence30d: number;
  /** Active (non-archived) habit definitions count. */
  activeHabits: number;
  /** Distinct days with any logged activity in the last 30 days. */
  activeDays30d: number;
}

/**
 * Deterministic placeholder. Returns "seed" until the real engine lands.
 * Kept here so call sites can be wired without an ADR violation; the
 * function is pure and safe to call from server fns.
 */
export function previewIdentityLevel(_signals: IdentitySignals): KhalilIdentityLevel {
  return "seed";
}
