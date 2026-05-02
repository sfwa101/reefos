import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fireConfetti } from "@/lib/confetti";
import type { Tx } from "@/features/wallet/types/wallet.types";

/**
 * useWalletTransactions — isolated transaction history slice.
 * Triggers the referral confetti when a fresh reward lands.
 */
export const useWalletTransactions = (userId: string | null) => {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTxs([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("id,label,amount,kind,created_at,source")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!mounted) return;
      const rows = (data ?? []) as Tx[];
      setTxs(rows);
      setLoading(false);

      const lastReward = rows.find(
        (t) => t.kind === "reward" && t.source === "referral",
      );
      if (lastReward) {
        const ageH =
          (Date.now() - new Date(lastReward.created_at).getTime()) / 36e5;
        if (ageH < 0.1) setTimeout(fireConfetti, 400);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return { txs, loading };
};
