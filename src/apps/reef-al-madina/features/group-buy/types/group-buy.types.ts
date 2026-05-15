// Re-exported from the kernel contract so existing app imports keep working
// while `src/core/**` only depends on the neutral port (Constitution v5.1
// Article 2 — Kernel Purity).
export type {
  GroupBuyStatus,
  GroupBuyPledgeStatus,
  GroupBuyCampaign,
  GroupBuyTier,
  GroupBuyPledge,
  ResolvedTierState,
} from "@/core/contracts/group-buy";
