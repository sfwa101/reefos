import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { isGodMode } from "@/lib/godMode";
import type { VendorLiveOrderItem, VendorProduct } from "../types/vendor-ops.types";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("user_vendor_ids", { _user_id: user.id }).then(({ data, error }: { data: string[]; error: { message: string } | null }) => {
      if (error) { setError(error.message); return; }
      setVendorIds(data ?? []);
    });
  }, [user]);

  const refreshProducts = useCallback(async () => {
    if (vendorIds.length === 0) { setProducts([]); productIdsRef.current = new Set(); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("products")
      .select("id,vendor_id,name,price,stock,is_active,image_url,image,category")
      .in("vendor_id", vendorIds)
      .order("name");
    if (error) { setError(error.message); return; }
    const rows = (data ?? []) as VendorProduct[];
    setProducts(rows);
    productIdsRef.current = new Set(rows.map(r => r.id));
  }, [vendorIds]);

  const refreshLiveItems = useCallback(async () => {
    if (vendorIds.length === 0) { setItems([]); return; }
    // Sovereign read: vendor's fulfillment nodes ➜ items ➜ sku ➜ asset.
    const { data, error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .select(`
        id, status, vendor_id, master_order_id, created_at,
        salsabil_master_orders!salsabil_fulfillment_nodes_master_fk ( delivery_info ),
        salsabil_fulfillment_items (
          id, quantity, price_at_time, created_at,
          salsabil_skus (
            id,
            salsabil_assets ( id, name, media )
          )
        )
      `)
      .in("vendor_id", vendorIds)
      .in("status", Array.from(ACTIVE_NODE_STATUSES))
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) { setError(error.message); return; }

    const rows: VendorLiveOrderItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).forEach((node: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deliveryInfo: any = node?.salsabil_master_orders?.delivery_info ?? {};
      const serviceType = deliveryInfo?.service_type ?? "delivery";
      const paymentMethod = deliveryInfo?.payment_method ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fis: any[] = node?.salsabil_fulfillment_items ?? [];
      fis.forEach((it) => {
        const sku = it?.salsabil_skus;
        const asset = sku?.salsabil_assets;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const media = (asset?.media as any) ?? {};
        const image = Array.isArray(media) ? (media[0]?.url ?? null) : (media?.url ?? null);
        rows.push({
          id: it.id,
          order_id: node.master_order_id ?? node.id,
          product_id: asset?.id ?? sku?.id ?? "",
          product_name: asset?.name ?? "منتج",
          product_image: image,
          quantity: it.quantity,
          price: Number(it.price_at_time ?? 0),
          created_at: it.created_at ?? node.created_at,
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
    const ch = supabase
      .channel(`vendor-ops-${vendorIds.join("-")}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" }, (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = (payload.new ?? payload.old) as any;
        if (!row?.vendor_id || !vendorIds.includes(row.vendor_id)) return;
        refreshLiveItems();
        if (payload.eventType === "INSERT") {
          toast.success("طلب سيادي جديد لمتجرك");
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "salsabil_fulfillment_items" }, () => {
        refreshLiveItems();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = (payload.new ?? payload.old) as any;
        if (!row?.vendor_id || !vendorIds.includes(row.vendor_id)) return;
        refreshProducts();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendorIds, refreshLiveItems, refreshProducts]);

  /** Update product stock & active flag. Authorized via RLS on products. */
  const updateProductStock = useCallback(async (productId: string, newQty: number, isActive: boolean) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newQty, is_active: isActive } : p));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("products")
      .update({ stock: newQty, is_active: isActive })
      .eq("id", productId);
    if (error) {
      toast.error("تعذّر تحديث المنتج", { description: error.message });
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
