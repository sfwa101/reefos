import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  GroupBuyCampaign,
  GroupBuyTier,
  GroupBuyPledge,
  ResolvedTierState,
} from "../types/group-buy.types";

interface UseGroupBuyEngineResult {
  campaign: GroupBuyCampaign | null;
  tiers: GroupBuyTier[];
  myPledge: GroupBuyPledge | null;
  loading: boolean;
  error: string | null;
  tierState: ResolvedTierState;
  pledge: (quantity: number) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
  refresh: () => Promise<void>;
}

const computeTierState = (
  campaign: GroupBuyCampaign | null,
  tiers: GroupBuyTier[],
): ResolvedTierState => {
  if (!campaign) {
    return {
      currentTier: null,
      nextTier: null,
      currentPrice: 0,
      unitsToNextDrop: 0,
      progressPct: 0,
    };
  }
  const sorted = [...tiers].sort((a, b) => a.quantity_threshold - b.quantity_threshold);
  const qty = campaign.current_quantity;
  const currentTier = [...sorted].reverse().find((t) => t.quantity_threshold <= qty) ?? null;
  const nextTier = sorted.find((t) => t.quantity_threshold > qty) ?? null;
  const currentPrice = currentTier ? currentTier.price_per_unit : campaign.base_price;
  const unitsToNextDrop = nextTier ? Math.max(0, nextTier.quantity_threshold - qty) : 0;
  const progressPct = Math.min(100, (qty / Math.max(1, campaign.target_quantity)) * 100);
  return { currentTier, nextTier, currentPrice, unitsToNextDrop, progressPct };
};

export const useGroupBuyEngine = (campaignId: string | null | undefined): UseGroupBuyEngineResult => {
  const [campaign, setCampaign] = useState<GroupBuyCampaign | null>(null);
  const [tiers, setTiers] = useState<GroupBuyTier[]>([]);
  const [myPledge, setMyPledge] = useState<GroupBuyPledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!campaignId) {
      setCampaign(null);
      setTiers([]);
      setMyPledge(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;

      const [{ data: c, error: ce }, { data: t, error: te }] = await Promise.all([
        supabase.from("group_buy_campaigns" as never).select("*").eq("id", campaignId).maybeSingle(),
        supabase.from("group_buy_tiers" as never).select("*").eq("campaign_id", campaignId),
      ]);
      if (ce) throw ce;
      if (te) throw te;
      setCampaign((c as GroupBuyCampaign | null) ?? null);
      setTiers((t as GroupBuyTier[] | null) ?? []);

      if (uid) {
        const { data: p } = await supabase
          .from("group_buy_pledges" as never)
          .select("*")
          .eq("campaign_id", campaignId)
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setMyPledge((p as GroupBuyPledge | null) ?? null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "load_failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: campaign current_quantity & status updates for FOMO
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`gb-campaign-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_buy_campaigns", filter: `id=eq.${campaignId}` },
        (payload) => {
          const next = payload.new as GroupBuyCampaign;
          setCampaign((prev) => (prev ? { ...prev, ...next } : next));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_buy_pledges", filter: `campaign_id=eq.${campaignId}` },
        () => {
          // Refresh own pledge view on any change
          fetchAll();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchAll]);

  const tierState = useMemo(() => computeTierState(campaign, tiers), [campaign, tiers]);

  const pledge = useCallback(
    async (quantity: number) => {
      if (!campaignId) return { ok: false, error: "no_campaign" };
      if (!quantity || quantity <= 0) return { ok: false, error: "invalid_quantity" };

      // Optimistic UI bump for FOMO
      setCampaign((prev) =>
        prev ? { ...prev, current_quantity: prev.current_quantity + quantity } : prev,
      );

      const { data, error: rpcErr } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>)("pledge_group_buy", {
        _campaign_id: campaignId,
        _quantity: quantity,
      });

      if (rpcErr) {
        // Roll back optimistic bump
        setCampaign((prev) =>
          prev ? { ...prev, current_quantity: Math.max(0, prev.current_quantity - quantity) } : prev,
        );
        return { ok: false, error: rpcErr.message };
      }
      await fetchAll();
      return { ok: true, data };
    },
    [campaignId, fetchAll],
  );

  return { campaign, tiers, myPledge, loading, error, tierState, pledge, refresh: fetchAll };
};
