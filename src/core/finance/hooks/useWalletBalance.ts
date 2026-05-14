import { useEffect, useState } from "react";
import { FinanceGateway, type GatewayChannel } from "@/core/finance/gateway/FinanceGateway";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { tierProgress, type TierDef } from "@/lib/tiers";
import type {
  Profile,
  WalletBalance,
} from "@/core/finance/types/wallet.types";

/**
 * useWalletBalance — focused slice of the wallet data graph.
 * Owns: auth identity, balance row, profile, trust limit, tier.
 * Isolated to keep heavy analytics / savings re-renders out of the
 * core balance card surface.
 */
export const useWalletBalance = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trustLimit, setTrustLimit] = useState<number>(0);
  const [tier, setTier] = useState<TierDef | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let uid: string | null = null;
    // Realtime channel handle — opened after we know the user id.
    let channel: GatewayChannel | null = null;

    const refetch = async (id: string) => {
      const [bal, prof, trust, spent] = await Promise.all([
        FinanceGateway.getWalletBalanceLegacy(id),
        FinanceGateway.getProfileBasic(id),
        FinanceGateway.getUserTrustLimit(id),
        FinanceGateway.getUserTotalSpent(id),
      ]);
      if (!mounted) return;
      setBalance((bal as WalletBalance | null) ?? { balance: 0, points: 0, coupons: 0, cashback: 0 });
      setProfile((prof as Profile | null) ?? { full_name: null, short_id: null });
      setTrustLimit(Number(trust ?? 0));
      setTier(tierProgress(Number(spent ?? 0)).tier);
      setLoading(false);
    };

    (async () => {
      const userIdFromAuth = await IdentityGateway.getCurrentUserId();
      if (!userIdFromAuth) {
        if (mounted) setLoading(false);
        return;
      }
      if (!mounted) return;
      uid = userIdFromAuth;
      setUserId(userIdFromAuth);
      await refetch(userIdFromAuth);

      // Live balance — Lovable Cloud Realtime on the user's row.
      // Refetches the full slice (balance + trust + tier) on any change.
      channel = FinanceGateway.subscribeWalletBalance(userIdFromAuth, () => {
        if (uid) refetch(uid);
      });
    })();

    return () => {
      mounted = false;
      if (channel) channel.unsubscribe();
    };
  }, []);

  return { userId, balance, setBalance, profile, trustLimit, tier, loading };
};
