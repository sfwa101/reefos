import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VendorGateway } from "@/core/vendor/gateway/VendorGateway";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { isGodMode } from "@/lib/godMode";
import type { VendorLiveOrderItem, VendorProduct } from "../types/vendor-ops.types";
import { historicalLineTotal } from "@/core/commerce/pricing/historicalLineTotal";

const MOCK_VENDOR_IDS = ["god-mode-vendor"];
const MOCK_VENDOR_PRODUCTS: VendorProduct[] = [
  { id: "mock-prod-1", vendor_id: "god-mode-vendor", name: "منتج تجريبي ١", price: 50, stock: 12, is_active: true, image_url: null, image: null, category: "general" } as unknown as VendorProduct,
  { id: "mock-prod-2", vendor_id: "god-mode-vendor", name: "منتج تجريبي ٢", price: 75, stock: 3, is_active: true, image_url: null, image: null, category: "general" } as unknown as VendorProduct,
];

const READY_KEY = "vendor.readyItems.v1";

const loadReady = (): Record<string, true> => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(READY_KEY) || "{}"); } catch { return {}; }
};
const saveReady = (m: Record<string, true>) => {
  try { localStorage.setItem(READY_KEY, JSON.stringify(m)); } catch { /* noop */ }
};

// Active node statuses the vendor should still be working on.
const ACTIVE_NODE_STATUSES = new Set([
  "pending", "confirmed", "preparing", "ready",
  "assigned", "picked_up", "out_for_delivery",
]);

/**
 * Vendor Operational Hook — Sovereign Matrix Edition (Phase 14 Part 2)
 *
 * Reads exclusively from `salsabil_fulfillment_nodes` ➜
 * `salsabil_fulfillment_items` ➜ `salsabil_skus` ➜ `salsabil_assets`.
 * Joined to `salsabil_master_orders` for customer / delivery context.
 *
 * Legacy `public.orders` and `public.order_items` are no longer touched.
 * The product catalog still uses the `products` shim until the SDUI
 * cutover is complete.
 */
export function useVendorOperations() {
  const { user } = useAuth();
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [items, setItems] = useState<VendorLiveOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef<Record<string, true>>(loadReady());
  const productIdsRef = useRef<Set<string>>(new Set());

  // Load vendor account ids
  useEffect(() => {
    if (isGodMode()) {
      setVendorIds(MOCK_VENDOR_IDS);
      setProducts(MOCK_VENDOR_PRODUCTS);
      setItems([]);
      setLoading(false);
      return;
    }
    if (!user) { setVendorIds([]); return; }
    VendorGateway.getUserVendorIds(user.id)
      .then((data) => setVendorIds(data ?? []))
      .catch((err: { message?: string }) => {
        if (err?.message) setError(err.message);
      });
  }, [user]);

  const refreshProducts = useCallback(async () => {
    if (vendorIds.length === 0) { setProducts([]); productIdsRef.current = new Set(); return; }
    // Phase 15.1 — Sovereign Catalog read.
    // The vendor cockpit now reads from salsabil_assets ➜ skus ➜ contracts/inventory
    // (vendor_id scoping at the asset level is a future phase; for now we expose
    // the active catalog so vendors can see/edit stock + price on Sovereign rows).
    let data: unknown[];
    try {
      data = await VendorGateway.listSovereignAssetsCatalog();
    } catch (err) {
      const e = err as { message?: string };
      if (e?.message) setError(e.message);
      return;
    }
    type SkuRow = {
      id?: string;
      sort_order?: number;
      is_active?: boolean;
      salsabil_financial_contracts?: Array<{ base_price?: number | string | null }> | null;
      salsabil_inventory_matrix?: Array<{ availability_data?: { stock?: number; qty?: number; is_active?: boolean } | null }> | null;
    };
    type AssetRow = {
      id: string;
      name: string;
      category_path?: string | null;
      media?: unknown;
      salsabil_skus?: SkuRow[] | null;
    };
    const rows: VendorProduct[] = ((data ?? []) as unknown as AssetRow[]).map((a) => {
      const skus = (a.salsabil_skus ?? []).slice().sort(
        (x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0),
      );
      const primary: SkuRow = skus.find((s) => s.is_active !== false) ?? skus[0] ?? {};
      const price = Number(primary?.salsabil_financial_contracts?.[0]?.base_price ?? 0);
      const availability = primary?.salsabil_inventory_matrix?.[0]?.availability_data ?? {};
      const stock = Number(availability?.stock ?? availability?.qty ?? 0);
      const isActive = availability?.is_active ?? true;
      const media = a.media;
      const image = Array.isArray(media)
        ? (typeof media[0] === "string" ? media[0] : (media[0] as { url?: string })?.url ?? null)
        : null;
      return {
        id: primary?.id ?? a.id, // sku id is the addressable unit for stock writes
        vendor_id: vendorIds[0] ?? null,
        name: a.name,
        price,
        stock,
        is_active: !!isActive,
        image_url: image,
        image,
        category: a.category_path?.split("/")[0] ?? "general",
      };
    });
    setProducts(rows);
    productIdsRef.current = new Set(rows.map(r => r.id));
  }, [vendorIds]);

  const refreshLiveItems = useCallback(async () => {
    if (vendorIds.length === 0) { setItems([]); return; }
    // Sovereign read: vendor's fulfillment nodes ➜ items ➜ sku ➜ asset.
    let data: unknown[];
    try {
      data = await VendorGateway.listVendorLiveFulfillmentNodes(
        vendorIds,
        Array.from(ACTIVE_NODE_STATUSES),
      );
    } catch (err) {
      const e = err as { message?: string };
      if (e?.message) setError(e.message);
      return;
    }

    const rows: VendorLiveOrderItem[] = [];
    type FulfillmentItemRow = {
      id: string;
      quantity: number;
      price_at_time?: number | string | null;
      created_at?: string | null;
      salsabil_skus?: {
        id?: string;
        salsabil_assets?: {
          id?: string;
          name?: string;
          media?: unknown;
        } | null;
      } | null;
    };
    type NodeRow = {
      id: string;
      master_order_id?: string | null;
      status: string;
      created_at?: string | null;
      salsabil_master_orders?: {
        delivery_info?: {
          service_type?: string;
          payment_method?: string | null;
        } | null;
      } | null;
      salsabil_fulfillment_items?: FulfillmentItemRow[] | null;
    };
    ((data ?? []) as unknown as NodeRow[]).forEach((node) => {
      const deliveryInfo = node?.salsabil_master_orders?.delivery_info ?? {};
      const serviceType = deliveryInfo?.service_type ?? "delivery";
      const paymentMethod = deliveryInfo?.payment_method ?? null;
      const fis: FulfillmentItemRow[] = node?.salsabil_fulfillment_items ?? [];
      fis.forEach((it) => {
        const sku = it?.salsabil_skus;
        const asset = sku?.salsabil_assets;
        const media = (asset?.media ?? {}) as unknown;
        const image = Array.isArray(media)
          ? ((media[0] as { url?: string })?.url ?? null)
          : ((media as { url?: string })?.url ?? null);
        const price = Number(it.price_at_time ?? 0);
        const quantity = it.quantity;
        rows.push({
          id: it.id,
          order_id: node.master_order_id ?? node.id,
          product_id: asset?.id ?? sku?.id ?? "",
          product_name: asset?.name ?? "منتج",
          product_image: image,
          quantity,
          price,
          total: historicalLineTotal({ price, quantity }),
          created_at: it.created_at ?? node.created_at ?? new Date().toISOString(),
          order_status: node.status,
          service_type: serviceType,
          payment_method: paymentMethod,
          ready: !!readyRef.current[it.id],
        });
      });
    });
    setItems(rows);
  }, [vendorIds]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([refreshProducts(), refreshLiveItems()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshProducts, refreshLiveItems]);

  // Realtime subscriptions — bound to Sovereign tables.
  useEffect(() => {
    if (vendorIds.length === 0) return;
    const ch = VendorGateway.subscribeVendorOps(vendorIds, {
      onFulfillmentNode: (payload) => {
        const row = (payload.new ?? payload.old) as { vendor_id?: string } | undefined;
        if (!row?.vendor_id || !vendorIds.includes(row.vendor_id)) return;
        refreshLiveItems();
        if (payload.eventType === "INSERT") {
          toast.success("طلب سيادي جديد لمتجرك");
        }
      },
      onFulfillmentItem: () => { refreshLiveItems(); },
      onInventory: () => { refreshProducts(); },
      onFinancialContract: () => { refreshProducts(); },
    });
    return () => { ch.unsubscribe(); };
  }, [vendorIds, refreshLiveItems, refreshProducts]);

  /** Phase 15.1 — Sovereign stock writes. `productId` here is a SKU id;
   *  we upsert the inventory row on `salsabil_inventory_matrix` keyed by sku_id. */
  const updateProductStock = useCallback(async (productId: string, newQty: number, isActive: boolean) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newQty, is_active: isActive } : p));
    const { error } = await VendorGateway.upsertSkuInventory(productId, {
      stock: newQty,
      is_active: isActive,
    });
    if (error) {
      toast.error("تعذّر تحديث المخزون", { description: error.message });
      await refreshProducts();
      return false;
    }
    toast.success("تم التحديث");
    return true;
  }, [refreshProducts]);

  /** Mark a fulfillment item as "Ready". Local-only pulse (per-device). */
  const markOrderItemReady = useCallback(async (orderItemId: string) => {
    readyRef.current = { ...readyRef.current, [orderItemId]: true };
    saveReady(readyRef.current);
    setItems(prev => prev.map(i => i.id === orderItemId ? { ...i, ready: true } : i));
    toast.success("تم تجهيز الطلب");
    return true;
  }, []);

  const undoReady = useCallback((orderItemId: string) => {
    const next = { ...readyRef.current };
    delete next[orderItemId];
    readyRef.current = next;
    saveReady(next);
    setItems(prev => prev.map(i => i.id === orderItemId ? { ...i, ready: false } : i));
  }, []);

  const summary = useMemo(() => {
    const pending = items.filter(i => !i.ready).length;
    const ready = items.filter(i => i.ready).length;
    const lowStock = products.filter(p => p.is_active && p.stock < 5).length;
    const inactive = products.filter(p => !p.is_active).length;
    return { pending, ready, lowStock, inactive, totalItems: items.length, totalProducts: products.length };
  }, [items, products]);

  return {
    loading,
    error,
    vendorIds,
    products,
    items,
    summary,
    updateProductStock,
    markOrderItemReady,
    undoReady,
    refresh: () => Promise.all([refreshProducts(), refreshLiveItems()]),
  };
}
