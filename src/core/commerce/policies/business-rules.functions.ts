// Business Rules Gateway — Wave R-1 · Batch 6.
// Admin-only handlers for loyalty tier rules and incentive milestones.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIERS = new Set(["bronze", "silver", "gold", "platinum", "vip"]);

export type TierRuleRow = {
  id: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "vip";
  discount_pct: number;
  points_multiplier: number;
  min_lifetime_spend: number;
  is_active: boolean;
};

export type MilestoneRow = {
  id: string;
  key: string;
  threshold: number;
  title: string;
  reward: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

export const listLoyaltyTierRulesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<TierRuleRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("loyalty_tier_rules")
      .select("*")
      .order("min_lifetime_spend", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as TierRuleRow[];
  });

export const updateLoyaltyTierRuleFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    discount_pct: number;
    points_multiplier: number;
    min_lifetime_spend: number;
    is_active: boolean;
  }) => {
    const id = String(d?.id ?? "").trim();
    if (!UUID_RE.test(id)) throw new Error("invalid_id");
    const discount_pct = Number(d?.discount_pct);
    const points_multiplier = Number(d?.points_multiplier);
    const min_lifetime_spend = Number(d?.min_lifetime_spend);
    if (!Number.isFinite(discount_pct) || discount_pct < 0 || discount_pct > 0.5)
      throw new Error("invalid_discount_pct");
    if (!Number.isFinite(points_multiplier) || points_multiplier < 0 || points_multiplier > 10)
      throw new Error("invalid_points_multiplier");
    if (!Number.isFinite(min_lifetime_spend) || min_lifetime_spend < 0)
      throw new Error("invalid_min_lifetime_spend");
    return { id, discount_pct, points_multiplier, min_lifetime_spend, is_active: !!d?.is_active };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("loyalty_tier_rules")
      .update({
        discount_pct: data.discount_pct,
        points_multiplier: data.points_multiplier,
        min_lifetime_spend: data.min_lifetime_spend,
        is_active: data.is_active,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listIncentiveMilestonesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<MilestoneRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("incentive_milestones")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as MilestoneRow[];
  });

export const updateIncentiveMilestoneFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    threshold: number;
    title: string;
    reward: string;
    sort_order: number;
    is_active: boolean;
  }) => {
    const id = String(d?.id ?? "").trim();
    if (!UUID_RE.test(id)) throw new Error("invalid_id");
    const threshold = Number(d?.threshold);
    if (!Number.isFinite(threshold) || threshold < 1) throw new Error("invalid_threshold");
    const title = String(d?.title ?? "").trim().slice(0, 200);
    const reward = String(d?.reward ?? "").trim().slice(0, 400);
    if (!title) throw new Error("invalid_title");
    if (!reward) throw new Error("invalid_reward");
    const sort_order = Number(d?.sort_order ?? 0);
    return { id, threshold, title, reward, sort_order, is_active: !!d?.is_active };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("incentive_milestones")
      .update({
        threshold: data.threshold,
        title: data.title,
        reward: data.reward,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// expose for unused-warning safety
export const _BUSINESS_RULES_TIERS = TIERS;
