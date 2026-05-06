/**
 * useWalletSearch — debounced async wallet lookup for the Tayseer console.
 *
 * Strategy:
 *  - If the search term is a valid UUID, fetch that wallet directly by id
 *    OR by user_id (so the CFO can paste either).
 *  - Otherwise, search profiles by full_name / phone (ILIKE) and join to wallets.
 *
 * No client-side full scans. All filtering happens server-side.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Wallet, WalletStatus } from "@/hooks/useTayseer";

export interface WalletSearchResult extends Wallet {
  profile?: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
  } | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAGE_SIZE = 12;

async function searchByUuid(term: string): Promise<WalletSearchResult[]> {
  const { data, error } = await supabase
    .from("wallets")
    .select(
      "id,user_id,balance,currency,status,created_at,updated_at," +
        "profile:profiles!wallets_user_id_fkey(user_id,full_name,phone)",
    )
    .or(`id.eq.${term},user_id.eq.${term}`)
    .limit(PAGE_SIZE);

  if (error) {
    // Fallback if no FK relationship is exposed
    const { data: bare, error: e2 } = await supabase
      .from("wallets")
      .select("id,user_id,balance,currency,status,created_at,updated_at")
      .or(`id.eq.${term},user_id.eq.${term}`)
      .limit(PAGE_SIZE);
    if (e2) throw e2;
    return (bare ?? []).map((w) => ({ ...(w as Wallet), profile: null }));
  }
  return (data ?? []) as unknown as WalletSearchResult[];
}

async function searchByName(term: string): Promise<WalletSearchResult[]> {
  // 1) Find matching profiles
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("user_id,full_name,phone")
    .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(PAGE_SIZE);
  if (pErr) throw pErr;

  const userIds = (profiles ?? []).map((p) => p.user_id).filter(Boolean);
  if (userIds.length === 0) return [];

  // 2) Pull wallets for those users
  const { data: wallets, error: wErr } = await supabase
    .from("wallets")
    .select("id,user_id,balance,currency,status,created_at,updated_at")
    .in("user_id", userIds)
    .limit(PAGE_SIZE * 2);
  if (wErr) throw wErr;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p] as const),
  );
  return (wallets ?? []).map((w) => ({
    ...(w as Wallet),
    status: (w as { status: string }).status as WalletStatus,
    profile: profileMap.get((w as Wallet).user_id) ?? null,
  })) as WalletSearchResult[];
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
