import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WalletTxn = {
  id: string;
  amount: number;
  kind: string;
  label: string;
  status: string;
  source: string | null;
  reference_order_id: string | null;
  created_at: string;
};

export type TxnGroup = {
  key: string;
  label: string;
  items: WalletTxn[];
};

const dayKey = (iso: string): string => iso.slice(0, 10);

const groupLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "اليوم";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "أمس";
  return d.toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

/**
 * useWalletTransactions — paginated transaction history grouped by day.
 * Returns the latest 100 wallet entries for the current user.
 */
export const useWalletTransactions = (userId: string | null) => {
  const [rows, setRows] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("wallet_transactions")
        .select(
          "id, amount, kind, label, status, source, reference_order_id, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!mounted) return;
      setRows((data ?? []) as WalletTxn[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const groups: TxnGroup[] = useMemo(() => {
    const map = new Map<string, WalletTxn[]>();
    for (const r of rows) {
      const k = dayKey(r.created_at);
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    return Array.from(map.entries()).map(([k, items]) => ({
      key: k,
      label: groupLabel(items[0].created_at),
      items,
    }));
  }, [rows]);

  return { rows, txs: rows, groups, loading };
};
