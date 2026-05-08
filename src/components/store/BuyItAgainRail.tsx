import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/products";
import { products as allProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { History } from "lucide-react";

interface Props {
  pool: Product[];
}

/** Mirror id convention from `mint_universal_asset`: usa_<uuid_no_dashes>. */
const assetIdToLegacyProductId = (assetId: string) =>
  `usa_${assetId.replace(/-/g, "")}`;

/**
 * Horizontal "اشتريتها سابقاً" rail. Phase 14 Part 1: now reads exclusively
 * from the Sovereign Matrix (salsabil_master_orders → fulfillment_nodes →
 * fulfillment_items → skus). Hidden if empty.
 */
const BuyItAgainRail = ({ pool }: Props) => {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: masters } = await supabase
          .from("salsabil_master_orders")
          .select("id")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        const masterIds = (masters ?? []).map((m) => m.id);
        if (masterIds.length === 0 || cancelled) return;

        const { data: nodes } = await supabase
          .from("salsabil_fulfillment_nodes")
          .select("id")
          .in("master_order_id", masterIds);
        const nodeIds = (nodes ?? []).map((n) => n.id);
        if (nodeIds.length === 0 || cancelled) return;

        const { data, error } = await supabase
          .from("salsabil_fulfillment_items")
          .select("created_at, salsabil_skus!inner(asset_id)")
          .in("node_id", nodeIds)
          .order("created_at", { ascending: false })
          .limit(60);
        if (error || !data || cancelled) return;

        const ids = Array.from(
          new Set(
            (data as Array<{ salsabil_skus: { asset_id: string | null } | null }>)
              .map((r) => r.salsabil_skus?.asset_id)
              .filter((aid): aid is string => Boolean(aid))
              .map(assetIdToLegacyProductId),
          ),
        );
        const poolIds = new Set(pool.map((p) => p.id));
        const fromOrders = ids
          .filter((id) => poolIds.has(id))
          .map((id) => allProducts.find((p) => p.id === id))
          .filter((p): p is Product => Boolean(p))
          .slice(0, 12);
        if (fromOrders.length) setItems(fromOrders);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [pool]);

  if (items.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-primary" strokeWidth={2.4} />
        <h2 className="font-display text-base font-extrabold text-foreground">
          اشتريتها سابقاً
        </h2>
        <span className="text-[10px] text-muted-foreground">· إعادة الطلب بضغطة</span>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
        {items.map((p) => (
          <div key={`bia-${p.id}`} className="w-[150px] shrink-0">
            <ProductCard product={p} variant="carousel" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default BuyItAgainRail;
