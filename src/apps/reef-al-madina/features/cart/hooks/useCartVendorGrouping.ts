import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CartLineMeta } from "@/core/orders/runtime/react/CartProvider";
import { CartGateway } from "@/core/orders/gateway/CartGateway";
/**
 * @deprecated Wave P-B B-3 — `Product` is the legacy bridge shape. The
 * cross-sell rail still emits `Product[]` because its consumer
 * (CartCrossSellRail / CartContext.add) reads `l.product.*`. Will move to
 * `ProductCardVM[]` once §2.E migrates.
 */
import type { Product } from "@/core/catalog/legacyProduct.types";
import { workspaceQueryKey } from "@/core/identity/workspace";

const SNAPSHOT_KEY = () => workspaceQueryKey("catalog", "products");
import {
  vendorForProduct,
  type VendorKey,
} from "@/lib/vendor-menu-config";
import {
  fulfillmentTypeFor,
  isSweetsProduct,
} from "@/core/commerce/variants/custom-fulfillment-rules";
import type { VendorGroup } from "../types/cart.types";

type Line = { product: Product; qty: number; meta?: CartLineMeta };

/**
 * Vendor segmentation, AI-driven cross-sell, and cashback aggregation.
 * Extracted from useCartOrchestrator with identical behavior.
 */
export const useCartVendorGrouping = (lines: Line[], payment: string) => {
  const [coPurchaseIds, setCoPurchaseIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const lineIdsKey = lines.map((l) => l.product.id).join(",");
  useEffect(() => {
    if (lines.length === 0) {
      setCoPurchaseIds([]);
      return;
    }
    const ids = lines.map((l) => l.product.id);
    let cancelled = false;
    // 800ms debounce — protects DB from per-keystroke qty bursts.
    const timer = setTimeout(() => {
      (async () => {
        const productIds = await CartGateway.fetchFrequentlyBoughtProductIds(ids, 6);
        if (!cancelled) setCoPurchaseIds(productIds);
      })();
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdsKey]);

  const crossSell = useMemo<Product[]>(() => {
    if (lines.length === 0) return [];
    // Wave P-B B-3 — read the catalog snapshot from the QueryClient cache
    // instead of importing the legacy `products` proxy. Returns [] before
    // hydration; cross-sell rail tolerates an empty list.
    const allProducts =
      queryClient.getQueryData<Product[]>(SNAPSHOT_KEY()) ?? [];
    const inCart = new Set(lines.map((l) => l.product.id));
    const cartSources = new Set(lines.map((l) => l.product.source));
    const cartCategories = new Set(lines.map((l) => l.product.category));
    const coReal = coPurchaseIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter((p): p is Product => !!p && !inCart.has(p.id));
    const heur = allProducts
      .filter(
        (p) =>
          !inCart.has(p.id) &&
          !coReal.find((c) => c.id === p.id) &&
          (cartSources.has(p.source) || cartCategories.has(p.category)),
      )
      .sort((a, b) => {
        const scoreA = (a.badge === "best" ? 3 : a.badge === "trending" ? 2 : 1) - a.price / 200;
        const scoreB = (b.badge === "best" ? 3 : b.badge === "trending" ? 2 : 1) - b.price / 200;
        return scoreB - scoreA;
      });
    return [...coReal, ...heur].slice(0, 6);
  }, [lines, coPurchaseIds, queryClient]);

  const vendorGroups = useMemo<VendorGroup[]>(() => {
    const map = new Map<string, VendorGroup>();
    for (const l of lines) {
      const v = vendorForProduct(l.product.id, l.product.source);
      const key =
        v.kind === "restaurant" ? `r:${v.restaurant.id}` : v.kind === "kitchen" ? "k" : "s";
      if (!map.has(key)) {
        map.set(key, { key, vendor: v, lines: [], subtotal: 0, cashback: 0 });
      }
      const g = map.get(key)!;
      g.lines.push(l);
      g.subtotal += l.product.price * l.qty;
    }
    for (const g of map.values()) {
      if (g.vendor.kind === "restaurant") {
        g.cashback = Math.round((g.subtotal * g.vendor.restaurant.cashbackPct) / 100);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const order = (v: VendorKey) =>
        v.kind === "restaurant" ? 0 : v.kind === "kitchen" ? 1 : 2;
      return order(a.vendor) - order(b.vendor);
    });
  }, [lines]);

  const isMultiVendor = vendorGroups.length > 1;
  const totalCashback = useMemo(
    () => (payment === "wallet" ? vendorGroups.reduce((s, g) => s + g.cashback, 0) : 0),
    [vendorGroups, payment],
  );

  const groupIsScheduled = (g: VendorGroup) =>
    g.lines.length > 0 &&
    g.lines.every((l) => {
      if (!isSweetsProduct(l.product.source)) return false;
      const t = fulfillmentTypeFor(l.product.id, l.product.subCategory);
      return t === "B" || t === "C";
    });
  const groupIsMixedScheduled = (g: VendorGroup) =>
    g.lines.some((l) => {
      if (!isSweetsProduct(l.product.source)) return false;
      const t = fulfillmentTypeFor(l.product.id, l.product.subCategory);
      return t === "B" || t === "C";
    });

  const instantGroups = vendorGroups.filter((g) => !groupIsScheduled(g));
  const scheduledGroups = vendorGroups.filter((g) => groupIsScheduled(g));
  const showFulfillmentSections = instantGroups.length > 0 && scheduledGroups.length > 0;

  return {
    crossSell,
    vendorGroups,
    instantGroups,
    scheduledGroups,
    showFulfillmentSections,
    isMultiVendor,
    totalCashback,
    groupIsMixedScheduled,
  };
};
