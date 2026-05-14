import { useEffect, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";
import { useAuth } from "@/context/AuthContext";
import { useVisibilitySocket } from "@/hooks/useVisibilitySocket";
import { pledgeGroupBuyFn } from "@/core/marketing/group-buy.functions";
import {
  groupBuyCampaignQueryOptions,
  myGroupBuyPledgeQueryOptions,
} from "@/lib/group-buy.queries";
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
  const qc = useQueryClient();
  const { user } = useAuth();
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
      const state = await qc.fetchQuery(groupBuyCampaignQueryOptions(campaignId));
      setCampaign(state.campaign);
      setTiers(state.tiers);
      if (user?.id) {
        const pledge = await qc.fetchQuery(myGroupBuyPledgeQueryOptions(campaignId, true));
        setMyPledge(pledge);
      } else {
        setMyPledge(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "load_failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [campaignId, qc, user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: campaign current_quantity & status updates for FOMO (Phase 44: visibility-aware)
  // EXEMPT: realtime channel subscription allowed (Wave P-D blueprint)
  useVisibilitySocket(
    () => {
      if (!campaignId) return;
      const channel = MarketingGateway.subscribeGroupBuyCampaign(campaignId, {
        onCampaignUpdate: (next) => {
          const n = next as unknown as GroupBuyCampaign;
          setCampaign((prev) => (prev ? { ...prev, ...n } : n));
        },
        onPledgeChange: () => {
          fetchAll();
        },
      });
      return () => {
        channel.unsubscribe();
      };
    },
    () => {
      if (campaignId) void fetchAll();
    },
    [campaignId, fetchAll],
    !!campaignId,
  );

  const tierState = useMemo(() => computeTierState(campaign, tiers), [campaign, tiers]);

  const pledge = useCallback(
    async (quantity: number) => {
      if (!campaignId) return { ok: false, error: "no_campaign" };
      if (!quantity || quantity <= 0) return { ok: false, error: "invalid_quantity" };

      // Optimistic UI bump for FOMO
      setCampaign((prev) =>
        prev ? { ...prev, current_quantity: prev.current_quantity + quantity } : prev,
      );

      try {
        const { data } = await pledgeGroupBuyFn({ data: { campaignId, quantity } });
        await fetchAll();
        return { ok: true, data };
      } catch (e) {
        // Roll back optimistic bump
        setCampaign((prev) =>
          prev ? { ...prev, current_quantity: Math.max(0, prev.current_quantity - quantity) } : prev,
        );
        const msg = e instanceof Error ? e.message : "pledge_failed";
        return { ok: false, error: msg };
      }
    },
    [campaignId, fetchAll],
  );

  return { campaign, tiers, myPledge, loading, error, tierState, pledge, refresh: fetchAll };
};
