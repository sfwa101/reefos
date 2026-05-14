/**
 * useAffiliateEngine
 * ------------------
 * Decoupled data layer for the affiliate / referral portal.
 *
 * Pulls four independent server-driven facts:
 *   1. The signed-in user's referral_code (auto-provisions on first call).
 *   2. The full ladder of affiliate_tiers (so progression UI is data-driven).
 *   3. The user's current state (current tier, invites, total earned).
 *   4. The commission ledger (wallet balance + recent earnings).
 *
 * NOTE: There is no "type=commission" column on `wallets` — commission
 * accrual is tracked in `commission_ledger`. Balance is derived as
 * sum(paid) - sum(clawed_back). Pending = sum(pending|vesting).
 */

import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";
import { useAuth } from "@/context/AuthContext";

export interface AffiliateTier {
  id: string;
  name: string;
  rank: number;
  min_successful_invites: number;
  commission_fixed: number;
  unlocks_wholesale: boolean;
  badge_emoji: string | null;
}

export interface AffiliateState {
  user_id: string;
  current_tier_id: string | null;
  successful_invites: number;
  total_commission_earned: number;
  unlocks_wholesale: boolean;
}

export interface CommissionEntry {
  id: string;
  order_id: string | null;
  product_name: string | null;
  category: string | null;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  vest_release_at: string | null;
}

export interface CommissionWallet {
  available: number;
  pending: number;
  lifetime: number;
  currency: string;
}

const QK = {
  code: (uid: string) => ["affiliate", "code", uid] as const,
  tiers: () => ["affiliate", "tiers"] as const,
  state: (uid: string) => ["affiliate", "state", uid] as const,
  ledger: (uid: string) => ["affiliate", "ledger", uid] as const,
};

// Phase 57 — Client-side code generation removed. The 6-digit code is now
// produced exclusively by the server-side `ensure_referral_code` RPC, which
// uses the user's National ID (last 6 digits) when available.


function useReferralCodeQuery(userId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: userId ? QK.code(userId) : ["affiliate", "code", "anon"],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Phase 57 — read from referral_codes (mirror), fall back to profiles.
      return await MarketingGateway.getReferralCode(userId!);
    },
  });

  const provision = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("not authenticated");
      // Phase 57 — server-authoritative 6-digit code (National ID derived).
      return await MarketingGateway.ensureReferralCode(userId);
    },
  });

  const provision = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("not authenticated");
      // Phase 57 — server-authoritative 6-digit code (National ID derived).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("ensure_referral_code", {
        _user_id: userId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (code) => {
      if (userId) qc.setQueryData(QK.code(userId), code);
    },
  });

  return { query, provision };
}

function useAffiliateTiersQuery() {
  return useQuery({
    queryKey: QK.tiers(),
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_tiers")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AffiliateTier[];
    },
  });
}

function useAffiliateStateQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? QK.state(userId) : ["affiliate", "state", "anon"],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_affiliate_state")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as AffiliateState | null;
    },
  });
}

function useCommissionLedgerQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? QK.ledger(userId) : ["affiliate", "ledger", "anon"],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_ledger")
        .select(
          "id, order_id, product_name, category, commission_amount, status, created_at, paid_at, vest_release_at",
        )
        .eq("affiliate_user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as CommissionEntry[];
    },
  });
}

export interface UseAffiliateEngine {
  loading: boolean;
  error: Error | null;
  referralCode: string | null;
  referralLink: string | null;
  provisionCode: () => Promise<string>;
  provisioning: boolean;
  tiers: AffiliateTier[];
  currentTier: AffiliateTier | null;
  nextTier: AffiliateTier | null;
  progressPct: number;
  invitesToNextTier: number;
  state: AffiliateState | null;
  wallet: CommissionWallet;
  history: CommissionEntry[];
}

export function useAffiliateEngine(): UseAffiliateEngine {
  const { user } = useAuth();
  const userId = user?.id;

  const codeQ = useReferralCodeQuery(userId);
  const tiersQ = useAffiliateTiersQuery();
  const stateQ = useAffiliateStateQuery(userId);
  const ledgerQ = useCommissionLedgerQuery(userId);

  return useMemo<UseAffiliateEngine>(() => {
    const tiers = tiersQ.data ?? [];
    const state = stateQ.data ?? null;
    const history = ledgerQ.data ?? [];

    const currentTier =
      (state?.current_tier_id &&
        tiers.find((t) => t.id === state.current_tier_id)) ||
      tiers[0] ||
      null;

    const nextTier =
      currentTier
        ? tiers.find((t) => t.rank > currentTier.rank) ?? null
        : tiers[0] ?? null;

    const invites = state?.successful_invites ?? 0;
    const lowerBound = currentTier?.min_successful_invites ?? 0;
    const upperBound = nextTier?.min_successful_invites ?? lowerBound;
    const span = Math.max(1, upperBound - lowerBound);
    const progressPct = nextTier
      ? Math.min(100, Math.max(0, ((invites - lowerBound) / span) * 100))
      : 100;
    const invitesToNextTier = nextTier
      ? Math.max(0, upperBound - invites)
      : 0;

    let available = 0;
    let pending = 0;
    let lifetime = 0;
    for (const e of history) {
      const amt = Number(e.commission_amount) || 0;
      lifetime += amt;
      if (e.status === "paid") available += amt;
      else if (e.status === "pending" || e.status === "vesting")
        pending += amt;
      else if (e.status === "clawed_back") available -= amt;
    }

    const referralCode = codeQ.query.data ?? null;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const referralLink = referralCode
      ? `${origin}/?ref=${encodeURIComponent(referralCode)}`
      : null;

    return {
      loading:
        codeQ.query.isLoading ||
        tiersQ.isLoading ||
        stateQ.isLoading ||
        ledgerQ.isLoading,
      error:
        (codeQ.query.error as Error | null) ??
        (tiersQ.error as Error | null) ??
        (stateQ.error as Error | null) ??
        (ledgerQ.error as Error | null) ??
        null,
      referralCode,
      referralLink,
      provisionCode: () => codeQ.provision.mutateAsync(),
      provisioning: codeQ.provision.isPending,
      tiers,
      currentTier,
      nextTier,
      progressPct,
      invitesToNextTier,
      state,
      wallet: {
        available: Math.max(0, available),
        pending,
        lifetime,
        currency: "EGP",
      },
      history,
    };
  }, [codeQ, tiersQ, stateQ, ledgerQ]);
}
