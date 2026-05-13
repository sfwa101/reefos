import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SavingsJar, SavingsTx } from "@/core/finance/types/wallet.types";

const DEFAULT_JAR: SavingsJar = {
  balance: 0,
  auto_save_enabled: false,
  round_to: 5,
  goal: null,
  goal_label: null,
};

/**
 * useWalletSavings — focused slice for the savings jar surface.
 * Owns the jar row + recent jar transactions and exposes setters
 * so the SavingsJarDialog can patch state in-place after an upsert.
 */
export const useWalletSavings = (userId: string | null) => {
  const [jar, setJar] = useState<SavingsJar | null>(null);
  const [jarTxs, setJarTxs] = useState<SavingsTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setJar(DEFAULT_JAR);
      setJarTxs([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const [{ data: jarRow }, { data: jarTx }] = await Promise.all([
        supabase
          .from("savings_jar")
          .select("balance,auto_save_enabled,round_to,goal,goal_label")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("savings_transactions")
          .select("id,amount,kind,label,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (!mounted) return;
      setJar(jarRow ?? DEFAULT_JAR);
      setJarTxs((jarTx ?? []) as SavingsTx[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return { jar, setJar, jarTxs, setJarTxs, loading };
};
