import { useEffect, useState } from "react";
import { CommerceGateway } from "@/core/commerce";
import type { Product } from "@/core/catalog/legacy/legacyProduct.types";
import { products as allProducts } from "@/core/catalog/legacy/legacyRuntime";
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
        const assetIds = await CommerceGateway.getRecentlyPurchasedAssetIds(60);
        if (cancelled || assetIds.length === 0) return;
        const legacyIds = assetIds.map(assetIdToLegacyProductId);
        const poolIds = new Set(pool.map((p) => p.id));
        const fromOrders = legacyIds
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
