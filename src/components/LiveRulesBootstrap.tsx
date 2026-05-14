import { useLiveRules } from "@/core/commerce/pricing/config/useLiveRules";

/**
 * Headless component — mounts `useLiveRules()` once near the root so
 * the synchronous `liveRules` cache stays hydrated for pricing/reward
 * rules. Renders nothing.
 */
export const LiveRulesBootstrap = (): null => {
  useLiveRules();
  return null;
};
