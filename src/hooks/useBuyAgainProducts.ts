/**
 * useBuyAgainProducts — Sovereign Matrix edition (Phase 14 Part 1).
 *
 * Reads exclusively from `salsabil_master_orders` →
 * `salsabil_fulfillment_nodes` → `salsabil_fulfillment_items` → `salsabil_skus`
 * to extract previously purchased asset_ids for the signed-in customer.
 * Asset_ids are mapped back to legacy product ids (via the `usa_<uuid>`
 * mirror minted by `mint_universal_asset`) so they resolve through the
 * SWR-cached catalog. Zero reads of legacy `orders` / `order_items`.
 */
import { useQuery } from "@tanstack/react-query";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";
import { useAuth } from "@/context/AuthContext";
import { useProductsQuery } from "@/hooks/useProductsQuery";
import type { Product } from "@/core/catalog/legacy/legacyProduct.types";

const MAX = 12;

/** Mirror id convention from `mint_universal_asset`: usa_<uuid_no_dashes>. */
const assetIdToLegacyProductId = (assetId: string) =>
  `usa_${assetId.replace(/-/g, "")}`;

export const useBuyAgainProducts = (
  /** When false, the network query is parked — used to defer fetch past first paint. */
  enabled: boolean = true,
): {
  products: Product[];
  isLoading: boolean;
} => {
  const { user } = useAuth();
  const { data: catalog = [], isLoading: catalogLoading } = useProductsQuery();

  const { data: ids = [], isLoading: idsLoading } = useQuery({
    queryKey: ["buy-again-sovereign", user?.id ?? "anon"] as const,
    enabled: enabled && Boolean(user?.id),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];

      // 1) Most recent master orders for this customer.
      const { data: masters, error: mErr } = await supabase
        .from("salsabil_master_orders")
        .select("id")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (mErr) throw mErr;
      const masterIds = (masters ?? []).map((m) => m.id);
      if (masterIds.length === 0) return [];

      // 2) All fulfillment nodes belonging to those master orders.
      const { data: nodes, error: nErr } = await supabase
        .from("salsabil_fulfillment_nodes")
        .select("id")
        .in("master_order_id", masterIds);
      if (nErr) throw nErr;
      const nodeIds = (nodes ?? []).map((n) => n.id);
      if (nodeIds.length === 0) return [];

      // 3) Items in those nodes — join SKU → asset_id.
      const { data: items, error: iErr } = await supabase
        .from("salsabil_fulfillment_items")
        .select("created_at, salsabil_skus!inner(asset_id)")
        .in("node_id", nodeIds)
        .order("created_at", { ascending: false })
        .limit(120);
      if (iErr) throw iErr;

      const seen = new Set<string>();
      const out: string[] = [];
      const rows = (items ?? []) as unknown as Array<{
        salsabil_skus: { asset_id: string | null } | null;
      }>;
      for (const it of rows) {
        const aid = it.salsabil_skus?.asset_id;
        if (!aid) continue;
        const legacyId = assetIdToLegacyProductId(aid);
        if (seen.has(legacyId)) continue;
        seen.add(legacyId);
        out.push(legacyId);
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
