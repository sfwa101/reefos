import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VendorWalletRow = {
  vendor_id: string;
  available_balance: number;
  pending_balance: number;
  lifetime_earned: number;
  lifetime_paid_out: number;
  vendor_name?: string | null;
};

export type VendorLedgerRow = {
  id: string;
  vendor_id: string;
  order_id: string | null;
  product_name: string | null;
  kind:
    | "credit_sale"
    | "debit_commission"
    | "debit_payout"
    | "reversal"
    | "adjustment";
  amount: number;
  status: "pending" | "cleared" | "reversed" | "failed";
  gross_amount: number | null;
  commission_pct: number | null;
  notes: string | null;
  created_at: string;
};

export type VendorPayoutRequestRow = {
  id: string;
  vendor_id: string;
  amount: number;
  method: "bank_transfer" | "vodafone_cash" | "instapay" | "cash";
  bank_details: Record<string, any>;
  status: "pending" | "processing" | "completed" | "rejected" | "cancelled";
  rejection_reason: string | null;
  created_at: string;
};

/**
 * useVendorSettlement — vendor financial reconciliation surface.
 * Reads aggregated wallet rows + immutable ledger + outstanding payout requests
 * and exposes a `requestPayout` action that uses the server-side RPC for
 * fund-locking (event-sourced, never trusts the client).
 */
export const useVendorSettlement = () => {
  const [wallets, setWallets] = useState<VendorWalletRow[]>([]);
  const [ledger, setLedger] = useState<VendorLedgerRow[]>([]);
  const [requests, setRequests] = useState<VendorPayoutRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const sb = supabase as any;
    const [w, l, r] = await Promise.all([
      sb
        .from("vendor_wallets")
        .select("*, vendors(name)"),
      sb
        .from("vendor_wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80),
      sb
        .from("vendor_payout_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setWallets(
      (w.data ?? []).map((row: any) => ({
        ...row,
        vendor_name: row.vendors?.name ?? null,
      })),
    );
    setLedger(l.data ?? []);
    setRequests(r.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    return wallets.reduce(
      (acc, w) => ({
        available: acc.available + Number(w.available_balance ?? 0),
        pending: acc.pending + Number(w.pending_balance ?? 0),
        earned: acc.earned + Number(w.lifetime_earned ?? 0),
        paid: acc.paid + Number(w.lifetime_paid_out ?? 0),
      }),
      { available: 0, pending: 0, earned: 0, paid: 0 },
    );
  }, [wallets]);

  const requestPayout = useCallback(
    async (
      vendorId: string,
      amount: number,
      method: VendorPayoutRequestRow["method"],
      bankDetails: Record<string, any>,
    ) => {
      setSubmitting(true);
      try {
        const { data, error } = await (supabase.rpc as any)(
          "request_vendor_payout",
          {
            _vendor_id: vendorId,
            _amount: amount,
            _method: method,
            _bank_details: bankDetails ?? {},
          },
        );
        if (error) throw error;
        await refresh();
        return { ok: true, data };
      } catch (err: any) {
        return { ok: false, error: err?.message ?? "payout_failed" };
      } finally {
        setSubmitting(false);
      }
    },
    [refresh],
  );

  return {
    loading,
    submitting,
    wallets,
    ledger,
    requests,
    totals,
    refresh,
    requestPayout,
  };
};
