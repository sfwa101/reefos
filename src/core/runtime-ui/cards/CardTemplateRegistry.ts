/**
 * Card Template Registry — pure resolver mapping product capabilities
 * to a card template name. No React, no side effects.
 *
 * The capability strings come from `section_capabilities` (DB) merged
 * with per-product overrides via `resolveProductCapabilities`. This file
 * is the single source of truth for "which template wins" and is easy
 * to unit-test in isolation.
 *
 * Priority order (first match wins):
 *   meal > wholesale > subscription > health > configurable > standard
 */

import { CAP } from "@/core/capabilities/CapabilityRegistry";

export type CardTemplateName =
  | "standard"
  | "meal"
  | "wholesale"
  | "subscription"
  | "health"
  | "configurable";

/**
 * Resolve which card template should render for a product given its
 * effective capability set. Pure function — same input → same output.
 */
export function resolveCardTemplate(
  capabilities: readonly string[],
): CardTemplateName {
  const set = new Set(capabilities);
  const has = (cap: string) => set.has(cap);

  if (has(CAP.MEAL_MODE)) return "meal";
  if (has(CAP.WHOLESALE)) return "wholesale";
  if (has(CAP.SUBSCRIPTION)) return "subscription";
  if (has(CAP.HEALTH_FILTERS)) return "health";
  if (has(CAP.VARIANTS) || has(CAP.ADDONS)) return "configurable";
  return "standard";
}

/** Ordered list of templates the registry knows about (for tooling/tests). */
export const CARD_TEMPLATE_NAMES: readonly CardTemplateName[] = [
  "standard",
  "meal",
  "wholesale",
  "subscription",
  "health",
  "configurable",
] as const;
