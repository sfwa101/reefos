/**
 * Phase 10.1 — useLiveRules
 * ----------------------------------------------------------------
 * One-shot React hook that fetches business rules from Supabase and
 * hydrates the synchronous `liveRules` cache used by pricing/reward
 * rules. Mount once near the app root (in `RootComponent`).
 *
 * Uses TanStack Query so:
 *   • Cache is shared across components.
 *   • Background refetch on focus / interval keeps cart in sync with
 *     admin edits.
 *   • Errors don't block the storefront — fallbacks are already in
 *     `liveRulesCache.ts`.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  hydrateMilestones,
  hydrateTierRules,
  type RawMilestoneDTO,
  type TierRuleDTO,
} from "./liveRulesCache";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchTierRules(): Promise<ReadonlyArray<TierRuleDTO>> {
  const { data, error } = await supabase
    .from("loyalty_tier_rules")
    .select("tier, discount_pct, points_multiplier, is_active");
  if (error) throw error;
  return (data ?? []) as ReadonlyArray<TierRuleDTO>;
}

async function fetchMilestones(): Promise<ReadonlyArray<RawMilestoneDTO>> {
  const { data, error } = await supabase
    .from("incentive_milestones")
    .select("key, threshold, title, reward, icon, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReadonlyArray<RawMilestoneDTO>;
}

export function useLiveRules(): { ready: boolean } {
  const tierQuery = useQuery({
    queryKey: ["live-rules", "tiers"],
    queryFn: fetchTierRules,
    staleTime: STALE_TIME,
  });

  const milestoneQuery = useQuery({
    queryKey: ["live-rules", "milestones"],
    queryFn: fetchMilestones,
    staleTime: STALE_TIME,
  });

  useEffect(() => {
    if (tierQuery.data) hydrateTierRules(tierQuery.data);
  }, [tierQuery.data]);

  useEffect(() => {
    if (milestoneQuery.data) hydrateMilestones(milestoneQuery.data);
  }, [milestoneQuery.data]);

  return { ready: !!tierQuery.data && !!milestoneQuery.data };
}

export { liveRules } from "./liveRulesCache";
