/**
 * useWalletSearch — debounced async wallet lookup for the Tayseer console.
 *
 * Strategy:
 *  - If the search term is a valid UUID, fetch that wallet directly by id
 *    OR by user_id (so the CFO can paste either).
 *  - Otherwise, search profiles by full_name / phone (ILIKE) and join to wallets.
 *
 * profiles.id == auth user id (== wallets.user_id). No client-side full scans.
 */
import { useQuery } from "@tanstack/react-query";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";
import type { Wallet, WalletStatus } from "@/hooks/useTayseer";

export interface WalletProfileLite {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export interface WalletSearchResult extends Wallet {
  profile: WalletProfileLite | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAGE_SIZE = 12;

async function fetchProfilesForUserIds(
  userIds: string[],
): Promise<Map<string, WalletProfileLite>> {
  if (userIds.length === 0) return new Map();
  const data = await FinanceGateway.listProfilesByIds(userIds);
  return new Map(
    data.map((p) => [
      p.id as string,
      { id: p.id as string, full_name: p.full_name, phone: p.phone },
    ]),
  );
}

async function searchByUuid(term: string): Promise<WalletSearchResult[]> {
  const data = await FinanceGateway.searchWalletsByOrUuid(term, PAGE_SIZE);
  const wallets = data as Wallet[];
  const profileMap = await fetchProfilesForUserIds(
    wallets.map((w) => w.user_id),
  );
  return wallets.map((w) => ({ ...w, profile: profileMap.get(w.user_id) ?? null }));
}

async function searchByName(term: string): Promise<WalletSearchResult[]> {
  const profiles = await FinanceGateway.searchProfilesByText(term, PAGE_SIZE);

  const userIds = profiles.map((p) => p.id as string);
  if (userIds.length === 0) return [];

  const wallets = await FinanceGateway.listWalletsByUserIds(userIds, PAGE_SIZE * 2);

  const profileMap = new Map(
    profiles.map((p) => [
      p.id as string,
      {
        id: p.id as string,
        full_name: p.full_name,
        phone: p.phone,
      } satisfies WalletProfileLite,
    ]),
  );

  return wallets.map((w) => {
    const wallet = w as Wallet & { status: string };
    return {
      ...wallet,
      status: wallet.status as WalletStatus,
      profile: profileMap.get(wallet.user_id) ?? null,
    };
  });
}

export function useWalletSearch(searchTerm: string) {
  const term = searchTerm.trim();
  const enabled = term.length >= 2;

  return useQuery<WalletSearchResult[]>({
    queryKey: ["tayseer", "wallet-search", term],
    enabled,
    staleTime: 15_000,
    queryFn: async () => {
      if (UUID_RE.test(term)) return searchByUuid(term);
      return searchByName(term);
    },
  });
}
