/**
 * @deprecated Phase 57 — superseded by
 *   `src/apps/reef-al-madina/features/affiliate/hooks/useAffiliateEngine.ts`,
 *   which is the canonical Success Partner engine (server-authoritative
 *   6-digit code, WhatsApp share, Tayseer payout). This module is kept only
 *   to avoid breaking `WalletAffiliateHub.tsx` until that hub is migrated.
 *   DO NOT extend; new affiliate UX must consume the reef-al-madina hook.
 */
import { useEffect, useState, useCallback } from "react";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";

export type AffiliateTier = {
  id: string;
  name: string;
  rank: number;
  min_successful_invites: number;
  commission_fixed: number;
  unlocks_wholesale: boolean;
  badge_emoji: string | null;
};

export type AffiliateState = {
  currentTier: AffiliateTier | null;
  nextTier: AffiliateTier | null;
  successfulInvites: number;
  totalCommission: number;
  unlocksWholesale: boolean;
  invitesToNext: number;
  progressPct: number; // 0..100 within current tier band
  loading: boolean;
};

const DEFAULT: AffiliateState = {
  currentTier: null,
  nextTier: null,
  successfulInvites: 0,
  totalCommission: 0,
  unlocksWholesale: false,
  invitesToNext: 0,
  progressPct: 0,
  loading: true,
};

/**
 * useAffiliateEngine — gamification surface for the tiered affiliate network.
 * Reads the user's current tier, total successful invites, and the next achievable
 * tier so the UI can render a progress bar and unlock callouts.
 */
export const useAffiliateEngine = (userId: string | null | undefined) => {
  const [state, setState] = useState<AffiliateState>(DEFAULT);

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ ...DEFAULT, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    // Make sure a code + state row exists.
    try {
      await MarketingGateway.ensureReferralCode(userId);
    } catch {
      /* non-fatal */
    }

    const [tiers, stateRow] = await Promise.all([
      MarketingGateway.listAffiliateTiers(),
      MarketingGateway.getUserAffiliateState(userId),
    ]);

    type RawTier = {
      id: string;
      name: string;
      rank: number;
      min_successful_invites: number;
      commission_fixed: number | string;
      unlocks_wholesale: boolean;
      badge_emoji: string | null;
    };
    const allTiers: AffiliateTier[] = ((tiers ?? []) as unknown as RawTier[]).map((t) => ({
      id: t.id,
      name: t.name,
      rank: t.rank,
      min_successful_invites: t.min_successful_invites,
      commission_fixed: Number(t.commission_fixed),
      unlocks_wholesale: t.unlocks_wholesale,
      badge_emoji: t.badge_emoji,
    }));
    const sr = stateRow as {
      successful_invites?: number;
      total_commission_earned?: number;
      unlocks_wholesale?: boolean;
      current_tier_id?: string;
    } | null;
    const invites: number = sr?.successful_invites ?? 0;

    const currentTier =
      allTiers.find((t) => t.id === sr?.current_tier_id) ??
      allTiers[0] ??
      null;
    const nextTier =
      allTiers.find(
        (t) => currentTier && t.rank > currentTier.rank,
      ) ?? null;

    const floor = currentTier?.min_successful_invites ?? 0;
    const ceil = nextTier?.min_successful_invites ?? floor + 1;
    const span = Math.max(1, ceil - floor);
    const progressPct = nextTier
      ? Math.min(100, Math.max(0, ((invites - floor) / span) * 100))
      : 100;
    const invitesToNext = nextTier
      ? Math.max(0, (nextTier.min_successful_invites ?? 0) - invites)
      : 0;

    setState({
      currentTier,
      nextTier,
      successfulInvites: invites,
      totalCommission: (sr?.total_commission_earned as number | undefined) ?? 0,
      unlocksWholesale:
        (sr?.unlocks_wholesale as boolean | undefined) ?? currentTier?.unlocks_wholesale ?? false,
      invitesToNext,
      progressPct,
      loading: false,
    });
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
};
