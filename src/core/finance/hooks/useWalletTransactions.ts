/**
 * useWalletTransactions — Phase 59 Sovereign Ledger source of truth.
 *
 * Reads ONLY from `public.ledger_entries` joined with `public.wallets`
 * for the authenticated user's EGP wallet. The legacy
 * `wallet_transactions` mirror has been retired — this hook is now the
 * single channel through which the customer sees their financial life.
 */
import { useEffect, useMemo, useState } from "react";
import { FinanceGateway, type GatewayChannel } from "@/core/finance/gateway/FinanceGateway";

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

const inferKind = (description: string | null, amount: number): string => {
  const d = (description ?? "").toLowerCase();
  if (d.includes("topup") || d.includes("deposit") || d.includes("شحن") || d.includes("إيداع")) return "topup";
  if (d.includes("order") || d.includes("checkout") || d.includes("طلب")) return "order";
  if (d.includes("gam") || d.includes("جمعية") || d.includes("circle")) return "gameya";
  if (d.includes("cashback") || d.includes("reward") || d.includes("commission") || d.includes("عمولة") || d.includes("كاش باك")) return "reward";
  if (d.includes("transfer") || d.includes("تحويل")) return amount > 0 ? "transfer_in" : "transfer_out";
  return amount > 0 ? "credit" : "debit";
};

/**
 * useWalletTransactions — paginated ledger history for the user's EGP wallet.
 * Returns the latest 100 sovereign ledger entries.
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
    let walletId: string | null = null;
    let channel: GatewayChannel | null = null;

    const loadEntries = async (wid: string) => {
      const data = await FinanceGateway.listLedgerEntriesByWallet(wid, 100);
      if (!mounted) return;
      const mapped: WalletTxn[] = (data as Array<{
        id: string;
        amount: number;
        description: string | null;
        created_at: string;
      }>).map((r) => {
        const amt = Number(r.amount);
        const kind = inferKind(r.description, amt);
        return {
          id: r.id,
          amount: amt,
          kind,
          label: r.description ?? (amt > 0 ? "إيداع" : "خصم"),
          status: "approved",
          source: "ledger",
          reference_order_id: null,
          created_at: r.created_at,
        };
      });
      setRows(mapped);
      setLoading(false);
    };

    (async () => {
      setLoading(true);
      const wallet = await FinanceGateway.getEgpWalletByUser(userId);

      if (!wallet?.id) {
        if (mounted) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      walletId = wallet.id;
      await loadEntries(wallet.id);

      // Realtime — append new ledger entries as they're written server-side.
      channel = FinanceGateway.subscribeWalletLedger(wallet.id, () => {
        if (walletId) loadEntries(walletId);
      });
    })();

    return () => {
      mounted = false;
      if (channel) channel.unsubscribe();
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
