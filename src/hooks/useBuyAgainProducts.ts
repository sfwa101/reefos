/**
 * useBuyAgainProducts — DB-driven "Buy It Again" rail.
 *
 * Pulls the most recent distinct `product_id`s from the signed-in user's
 * `order_items` history, then resolves them to live `Product` rows via
 * the SWR-cached products catalog. Falls back to an empty list for guests
 * or users with zero order history (UI hides the rail in that case).
 *
 * Architecture: pure data layer. No UI, no localStorage, no hardcoded
 * product ids. Single source of truth = Supabase orders.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProductsQuery } from "@/hooks/useProductsQuery";
import type { Product } from "@/lib/products";

const MAX = 12;

export const useBuyAgainProducts = (): {
  products: Product[];
  isLoading: boolean;
} => {
  const { user } = useAuth();
  const { data: catalog = [], isLoading: catalogLoading } = useProductsQuery();

  const { data: ids = [], isLoading: idsLoading } = useQuery({
    queryKey: ["buy-again", user?.id ?? "anon"] as const,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (oErr) throw oErr;
      const orderIds = (orders ?? []).map((o) => o.id);
      if (orderIds.length === 0) return [];

      const { data: items, error: iErr } = await supabase
        .from("order_items")
        .select("product_id, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
        .limit(80);
      if (iErr) throw iErr;

      const seen = new Set<string>();
      const out: string[] = [];
      for (const it of items ?? []) {
        const pid = it.product_id as string | null;
        if (!pid || seen.has(pid)) continue;
        seen.add(pid);
        out.push(pid);
        if (out.length >= MAX) break;
      }
      return out;
    },
  });

  if (!user?.id) return { products: [], isLoading: false };

  const map = new Map(catalog.map((p) => [p.id, p] as const));
  const products = ids
    .map((id) => map.get(id))
    .filter((p): p is Product => Boolean(p));

  return { products, isLoading: idsLoading || catalogLoading };
};
