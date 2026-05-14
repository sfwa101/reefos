/**
 * Tayseer Ledger v1 — TanStack Query hooks.
 * Single source of truth for wallet & ledger reads, plus the atomic transfer RPC.
 * No Zustand, no in-memory caches.
 */
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";

// -------------------- Types --------------------

export type WalletStatus = "active" | "frozen" | "closed";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  status: WalletStatus;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  wallet_id: string;
  transaction_group_id: string;
  amount: number;
  currency: string;
  description: string | null;
  idempotency_key: string;
  counterparty_wallet_id: string | null;
  created_at: string;
}

export interface TransferInput {
  sender_wallet_id: string;
  receiver_wallet_id: string;
  transfer_amount: number;
  transfer_currency: string;
  idempotency_key: string;
  transfer_description?: string | null;
}

// -------------------- Query keys --------------------

export const tayseerKeys = {
  all: ["tayseer"] as const,
  wallet: (id: string) => ["tayseer", "wallet", id] as const,
  ledger: (walletId: string | "all", filters?: Record<string, unknown>) =>
    ["tayseer", "ledger", walletId, filters ?? {}] as const,
};

// -------------------- useWalletQuery --------------------

export function useWalletQuery(
  walletId: string | undefined,
  options?: Omit<UseQueryOptions<Wallet | null>, "queryKey" | "queryFn">,
) {
  return useQuery<Wallet | null>({
    queryKey: tayseerKeys.wallet(walletId ?? "none"),
    enabled: !!walletId,
    queryFn: async () => {
      const data = await FinanceGateway.getWalletById(walletId!);
      return (data as Wallet | null) ?? null;
    },
    staleTime: 15_000,
    ...options,
  });
}

// -------------------- useLedgerQuery (paginated) --------------------

export interface LedgerFilters {
  walletId?: string;        // restrict to one wallet
  from?: string;            // ISO date inclusive
  to?: string;              // ISO date inclusive
  pageSize?: number;        // default 50
}

export function useLedgerQuery(filters: LedgerFilters = {}) {
  const pageSize = filters.pageSize ?? 50;
  return useInfiniteQuery({
    queryKey: tayseerKeys.ledger(filters.walletId ?? "all", { ...filters }),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as number) * pageSize;
      const { data, count } = await FinanceGateway.listLedgerEntriesPaginated({
        walletId: filters.walletId,
        from: filters.from,
        to: filters.to,
        offset,
        pageSize,
      });
      return {
        rows: data as LedgerEntry[],
        nextPage: data.length === pageSize ? (pageParam as number) + 1 : null,
        total: count,
      };
    },
    getNextPageParam: (last) => last.nextPage,
    staleTime: 10_000,
  });
}

// -------------------- useTransferMutation --------------------

export function useTransferMutation() {
  const qc = useQueryClient();
  return useMutation<string, Error, TransferInput>({
    mutationFn: async (input) => {
      return await FinanceGateway.tayseerTransferFunds(input);
    },
    onSuccess: (_groupId, vars) => {
      qc.invalidateQueries({ queryKey: tayseerKeys.wallet(vars.sender_wallet_id) });
      qc.invalidateQueries({ queryKey: tayseerKeys.wallet(vars.receiver_wallet_id) });
      qc.invalidateQueries({ queryKey: ["tayseer", "ledger"] });
    },
  });
}
