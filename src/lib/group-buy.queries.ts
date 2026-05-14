// React Query options for the Group-Buy Gateway (Phase D-4).
import { queryOptions } from "@tanstack/react-query";
import {
  getMyGroupBuyPledgeFn,
  listGroupBuyCampaignsFn,
} from "@/core/marketing/group-buy.functions";

export const groupBuyKeys = {
  all: ["group-buy"] as const,
  campaign: (campaignId: string) =>
    [...groupBuyKeys.all, "campaign", campaignId] as const,
  pledge: (campaignId: string) =>
    [...groupBuyKeys.all, "pledge", campaignId] as const,
};

export const groupBuyCampaignQueryOptions = (campaignId: string | null | undefined) =>
  queryOptions({
    queryKey: groupBuyKeys.campaign(campaignId ?? ""),
    queryFn: () =>
      listGroupBuyCampaignsFn({ data: { campaignId: campaignId! } }),
    enabled: !!campaignId,
    staleTime: 15_000,
  });

export const myGroupBuyPledgeQueryOptions = (
  campaignId: string | null | undefined,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: groupBuyKeys.pledge(campaignId ?? ""),
    queryFn: () =>
      getMyGroupBuyPledgeFn({ data: { campaignId: campaignId! } }),
    enabled: enabled && !!campaignId,
    staleTime: 15_000,
  });
