import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, type CartLineMeta } from "@/core/orders/runtime/react/CartProvider";
import { useSharedCartSync } from "./useSharedCartSync";
/**
 * @deprecated Wave P-B B-3 — `Product` is the legacy bridge shape kept only
 * to populate the deprecated `CartLine.product` field for §2.E external
 * consumers (CartRuntime / CartPanel / etc.) until they migrate to
 * `useCartHydration`.
 */
import type { Product } from "@/core/catalog/legacyProduct.types";
import { workspaceQueryKey } from "@/core/identity/workspace";
import { sumCanonicalGrandTotals } from "@/core/orders/runtime/lineTotals";

/**
 * Wave P-B B-3 — read the catalog snapshot through the QueryClient cache
 * (the same data formerly exposed by `@/lib/products`'s `products` proxy)
 * so this hook no longer imports from the static catalog. Returns `[]`
 * before the catalog hydrates; the shared-cart UI tolerates an empty
 * lookup window because the corresponding lines are simply skipped (the
 * existing pre-P-B code already had the same `productMap.get(...) →
 * continue` semantics for unknown ids).
 *
 * Wave P-7 Batch D — key now sourced from server-attested workspace id.
 */
const SNAPSHOT_KEY = () => workspaceQueryKey("catalog", "products");

const sharedLineIdentity = (
  productId: string,
  meta?: Record<string, unknown> | CartLineMeta,
) => {
  const m = (meta ?? {}) as CartLineMeta & { variant_id?: string };
  return [
    productId,
    m.kind ?? "buy",
    m.variantId ?? m.variant_id ?? "",
    m.bookingDate ?? "",
    m.bookingSlot ?? "",
    m.borrowDuration ?? "",
    (m.addonIds ?? []).slice().sort().join(","),
    m.printConfig
      ? `${m.printConfig.pages}-${m.printConfig.copies}-${m.printConfig.colorMode}-${m.printConfig.sided}-${m.printConfig.binding}-${m.printConfig.fileName ?? ""}`
      : "",
  ].join("|");
};

/**
 * Adapts the shared-cart RPC surface into the same shape as the local
 * CartRuntime so all downstream derivations work transparently in either
 * mode. Pure refactor extracted from useCartOrchestrator.
 */
export const useSharedCartAdapter = (sharedCartId: string | null) => {
  const local = useCart();
  const shared = useSharedCartSync(sharedCartId);
  const isSharedMode = !!sharedCartId;
  const queryClient = useQueryClient();

  const sharedLines = useMemo(() => {
    if (!isSharedMode) return [] as { product: Product; qty: number; meta?: CartLineMeta }[];
    const allProducts =
      queryClient.getQueryData<Product[]>(SNAPSHOT_KEY()) ?? [];
    const out: { product: Product; qty: number; meta?: CartLineMeta }[] = [];
    for (const it of shared.items) {
      const product = allProducts.find((p) => p.id === it.product_id);
      if (!product) continue;
      out.push({ product, qty: it.quantity, meta: it.meta as CartLineMeta | undefined });
    }
    return out;
  }, [isSharedMode, shared.items, queryClient]);

  const lines = isSharedMode ? sharedLines : local.lines;
  const count = isSharedMode ? sharedLines.reduce((s, l) => s + l.qty, 0) : local.count;
  const total = isSharedMode
    ? sumCanonicalGrandTotals(sharedLines)
    : local.total;

  const setQty: typeof local.setQty = isSharedMode
    ? async (productId, qty) => {
        const it = shared.items.find((i) => i.product_id === productId);
        if (it) await shared.updateItemQty(it.id, qty);
      }
    : local.setQty;

  const remove: typeof local.remove = isSharedMode
    ? async (productId) => {
        const it = shared.items.find((i) => i.product_id === productId);
        if (it) await shared.removeItem(it.id);
      }
    : local.remove;

  const add: typeof local.add = isSharedMode
    ? async (product, qty = 1, meta) => {
        const targetIdentity = sharedLineIdentity(product.id, meta);
        const existing = shared.items.find(
          (i) => sharedLineIdentity(i.product_id, i.meta) === targetIdentity,
        );
        if (existing) await shared.updateItemQty(existing.id, existing.quantity + qty);
        else
          await shared.addItem({
            product_id: product.id,
            product_name: product.name,
            unit_price: product.price,
            quantity: qty,
            meta: (meta ?? {}) as Record<string, unknown>,
          });
      }
    : local.add;

  const clear: typeof local.clear = isSharedMode
    ? async () => {
        await Promise.all(shared.items.map((i) => shared.removeItem(i.id)));
      }
    : local.clear;

  const updateMeta: typeof local.updateMeta = isSharedMode
    ? () => {
        // Itemized meta updates in shared mode are deferred to a follow-up phase.
      }
    : local.updateMeta;

  return {
    isSharedMode,
    lines,
    count,
    total,
    setQty,
    remove,
    add,
    clear,
    updateMeta,
    shared,
  };
};
