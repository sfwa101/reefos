import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tierProgress, type TierDef } from "@/lib/tiers";
import type {
  Profile,
  WalletBalance,
} from "@/core-os/finance/types/wallet.types";

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
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      if (!mounted) return;
      setUserId(user.id);

      const [
        { data: bal },
        { data: prof },
        { data: trust },
        { data: spent },
      ] = await Promise.all([
        supabase
          .from("wallet_balances")
          .select("balance,points,coupons,cashback")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.rpc("user_trust_limit", { _user_id: user.id }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).rpc("user_total_spent", { _user_id: user.id }),
      ]);

      if (!mounted) return;
      setBalance(bal ?? { balance: 0, points: 0, coupons: 0, cashback: 0 });
      setProfile(prof ?? { full_name: null });
      setTrustLimit(Number(trust ?? 0));
      setTier(tierProgress(Number(spent ?? 0)).tier);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { userId, balance, setBalance, profile, trustLimit, tier, loading };
};
