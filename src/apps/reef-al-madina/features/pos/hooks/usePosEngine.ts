import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { POSGateway } from "@/core/cashier/gateway/POSGateway";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { PosCartLine, PosProduct, PosShift } from "../types/pos.types";
import { fetchPosCatalog } from "@/core/catalog/gateway/SovereignCatalogGateway";
import { enqueueOfflineMutation, isLikelyNetworkError } from "@/lib/offlineSyncQueue";
import { useCashierPreview } from "@/core/cashier/gateway/hooks";
import { callSovereignCheckout } from "@/core/hakim-ai/hooks/useSovereignCheckout";
import { posCartSubtotal } from "../lib/posTotals";
import { Tracer } from "@/core/system/observability/Tracer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CART_KEY = "pos.cart.v1";
const CACHE_KEY = "pos.products.cache.v1";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min

const loadCart = (): PosCartLine[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
};
const saveCart = (lines: PosCartLine[]) => {
  try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* noop */ }
};

type CacheShape = { at: number; products: PosProduct[] };
const loadCache = (): PosProduct[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: CacheShape = JSON.parse(raw);
    if (Date.now() - c.at > CACHE_TTL_MS) return null;
    return c.products;
  } catch { return null; }
};
const saveCache = (products: PosProduct[]) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), products })); } catch { /* noop */ }
};

/**
 * usePosEngine — Local-First POS Orchestrator (Phase 17)
 * - Caches branch products in localStorage for blazing-fast offline search
 * - Persists cart locally so reload never drops items
 * - Listens to global keydown for hardware barcode scanners (rapid burst input)
 * - Enforces shift state: blocks sales unless an open `pos_shifts` row exists for the cashier
 */
export function usePosEngine() {
  const { user } = useAuth();
  const [products, setProducts] = useState<PosProduct[]>(() => loadCache() ?? []);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<PosCartLine[]>(() => loadCart());
  const [shift, setShift] = useState<PosShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Persist cart
  useEffect(() => { saveCart(cart); }, [cart]);

  // Online/offline state
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Load products (cached, then fresh) — Sovereign Catalog
  const refreshProducts = useCallback(async () => {
    try {
      const rows = (await fetchPosCatalog()) as unknown as PosProduct[];
      setProducts(rows);
      saveCache(rows);
    } catch {
      toast.error("تعذّر تحميل المنتجات");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductsLoading(true);
      await refreshProducts();
      if (!cancelled) setProductsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshProducts]);

  // Load active shift
  const refreshShift = useCallback(async () => {
    if (!user) { setShift(null); return; }
    const { shift: row, error } = await POSGateway.fetchOpenShiftForCashier(user.id);
    if (error) { Tracer.error("pos", "log", { args: [error] }); return; }
    setShift((row ?? null) as PosShift | null);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setShiftLoading(true);
      await refreshShift();
      if (!cancelled) setShiftLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshShift]);

  // Search index — local-first
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 24);
    return products
      .filter(p => p.name.toLowerCase().includes(q) || (p.barcode ?? "").includes(q) || p.id.toLowerCase().startsWith(q))
      .slice(0, 24);
  }, [products, query]);

  const findByBarcode = useCallback((code: string): PosProduct | null => {
    const c = code.trim();
    if (!c) return null;
    return products.find(p => p.barcode && p.barcode === c)
      || products.find(p => p.id === c)
      || null;
  }, [products]);

  // Cart ops
  const addProduct = useCallback((p: PosProduct, qty = 1) => {
    setCart(prev => {
      const i = prev.findIndex(l => l.product_id === p.id);
      if (i >= 0) {
        const next = [...prev]; next[i] = { ...next[i], qty: next[i].qty + qty }; return next;
      }
      return [...prev, { product_id: p.id, name: p.name, price: Number(p.price), qty, image_url: p.image_url }];
    });
  }, []);
  const incLine = useCallback((id: string) => setCart(p => p.map(l => l.product_id === id ? { ...l, qty: l.qty + 1 } : l)), []);
  const decLine = useCallback((id: string) => setCart(p => p.flatMap(l => l.product_id === id ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l])), []);
  const removeLine = useCallback((id: string) => setCart(p => p.filter(l => l.product_id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = useMemo(() => posCartSubtotal(cart), [cart]);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  // ---------- Cashier Brain — Sovereign price observer (Phase POS-2 Step 1) ----------
  const cashierPreview = useCashierPreview();
  const cashierMutate = cashierPreview.mutate;
  const [sovereignHash, setSovereignHash] = useState<string | null>(null);
  const [sovereignTotal, setSovereignTotal] = useState<number | null>(null);
  const [sovereignSignature, setSovereignSignature] = useState<string | null>(null);

  const cashierItems = useMemo(
    () =>
      cart
        .filter((l) => UUID_RE.test(l.product_id))
        .map((l) => ({ id: l.product_id, qty: l.qty })),
    [cart],
  );
  const allLinesAreUuid = cashierItems.length === cart.length;
  const cartSignature = useMemo(() => {
    if (cart.length === 0) return "";
    if (!allLinesAreUuid || cashierItems.length === 0) return "";
    return JSON.stringify(cashierItems.map((i) => [i.id, i.qty]));
  }, [cashierItems, allLinesAreUuid, cart.length]);

  useEffect(() => {
    if (!cartSignature) {
      setSovereignHash(null);
      setSovereignTotal(null);
      setSovereignSignature(null);
      return;
    }
    const timer = setTimeout(() => {
      cashierMutate(
        { items: cashierItems, context: { member_tier: "guest" } },
        {
          onSuccess: (snapshot) => {
            setSovereignHash(snapshot.snapshot_hash);
            setSovereignTotal(snapshot.totals.grand_total);
            setSovereignSignature(cartSignature);
          },
          onError: (err) => {
            if (import.meta.env.DEV) {
              Tracer.warn("pos", "pos_cashier_preview_failed", { args: ["[pos-cashier] preview failed:", err.message] });
            }
          },
        },
      );
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature]);

  const sovereignFresh =
    sovereignHash !== null &&
    sovereignSignature === cartSignature &&
    cartSignature !== "";
  const displayTotal = sovereignFresh && sovereignTotal !== null ? sovereignTotal : subtotal;

  // Hardware barcode scanner: detect rapid keystroke bursts ending in Enter
  const bufRef = useRef<{ chars: string[]; t: number }>({ chars: [], t: 0 });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      // Skip when user is typing in an input/textarea unless they hit Enter on a long burst
      const inField = tag === "input" || tag === "textarea";
      const now = Date.now();
      if (now - bufRef.current.t > 200) bufRef.current.chars = [];
      bufRef.current.t = now;
      if (e.key === "Enter") {
        const code = bufRef.current.chars.join("");
        bufRef.current.chars = [];
        // Heuristic: scanners deliver ≥6 chars in one burst
        if (code.length >= 6) {
          const p = findByBarcode(code);
          if (p) {
            e.preventDefault();
            addProduct(p);
            // Subtle success haptic — Phase 63 Zero-Friction
            try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([15, 30, 15]); } catch { /* noop */ }
            toast.success(`+ ${p.name}`);
          }
          else if (!inField) { toast.error("باركود غير معروف"); }
        }
        return;
      }
      if (e.key.length === 1) bufRef.current.chars.push(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [findByBarcode, addProduct]);

  // Shift management
  const openShift = useCallback(async (openingBalance: number, branchId: string | null) => {
    if (!user) { toast.error("غير مسجل دخول"); return null; }
    const { shift: row, error } = await POSGateway.openShift(user.id, branchId, openingBalance);
    if (error || !row) { toast.error("تعذّر فتح الورديّة", { description: error ?? undefined }); return null; }
    setShift(row as PosShift);
    toast.success("تم فتح الورديّة");
    return row as PosShift;
  }, [user]);

  const closeShift = useCallback(async (actualBalance: number) => {
    if (!shift) return null;
    const { shift: row, error } = await POSGateway.closeShift(shift.id, actualBalance);
    if (error) { toast.error("تعذّر إغلاق الورديّة", { description: error }); return null; }
    setShift(null);
    toast.success("تم إغلاق الورديّة");
    return row as PosShift;
  }, [shift]);

  // Checkout — Sovereign POS pipeline (Phase POS-2 Step 2):
  //  1. validatedSovereignCheckoutFn → server re-runs CashierBrain & vetoes on hash mismatch
  //  2. process_pos_cash_payment     → atomic cash settlement against the SERVER total
  //  3. pos_shifts counters          → operator accountability (against server total)
  // Offline: enqueue the validated server-fn payload so the price judge runs at drain.
  const checkout = useCallback(async (tendered: number) => {
    if (!user) { toast.error("غير مسجل دخول"); return null; }
    if (!shift) { toast.error("افتح ورديّة أولاً"); return null; }
    if (cart.length === 0) { toast.error("السلة فارغة"); return null; }
    if (!sovereignFresh || !sovereignHash || sovereignTotal === null) {
      throw new Error("السعر السيادي قيد المراجعة، يرجى الانتظار للحظة...");
    }
    const authoritativeTotal = sovereignTotal;
    if (tendered < authoritativeTotal) { toast.error("المبلغ المدفوع أقل من المطلوب"); return null; }

    const idem = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `pos_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const sovereignCartItems = cart.map(l => ({
      product_id: l.product_id,
      quantity: l.qty,
    }));
    const deliveryInfo = {
      channel: "pos",
      shift_id: shift.id,
      branch_id: shift.branch_id,
      cashier_id: user.id,
      tendered,
      payment_method: "cash",
    };

    const sovereignPayload = {
      customer_id: user.id,
      cart_items: sovereignCartItems,
      delivery_info: deliveryInfo,
      idempotency_key: idem,
      expected_snapshot_hash: sovereignHash,
      cashier_context: { member_tier: "guest" as const },
    };

    // OFFLINE FAST-PATH — queue the validated server-fn payload (hash travels with it)
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      await enqueueOfflineMutation({ op: "sovereign.checkout", payload: sovereignPayload });
      const change = tendered - authoritativeTotal;
      clearCart();
      toast.success(`حُفظ بدون اتصال — الباقي ${change.toFixed(2)}`);
      return { change, total: authoritativeTotal, offline: true };
    }

    // ONLINE — sovereign price judge + cash settlement
    let orderId: string;
    try {
      orderId = await callSovereignCheckout(sovereignPayload);
    } catch (e) {
      if (isLikelyNetworkError(e)) {
        await enqueueOfflineMutation({ op: "sovereign.checkout", payload: sovereignPayload });
        const change = tendered - authoritativeTotal;
        clearCart();
        toast.success(`حُفظ بدون اتصال — الباقي ${change.toFixed(2)}`);
        return { change, total: authoritativeTotal, offline: true };
      }
      const msg = e instanceof Error ? e.message : "تعذّر إنشاء الطلب";
      toast.error("تعذّر إنشاء الطلب", { description: msg });
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payRes = await POSGateway.processCashPayment(orderId, authoritativeTotal);
    if (payRes.error) {
      if (isLikelyNetworkError({ message: payRes.error })) {
        await enqueueOfflineMutation({
          op: "rpc",
          rpcName: "process_pos_cash_payment",
          payload: { p_order_id: orderId, p_amount: authoritativeTotal },
        });
        toast.warning("الطلب أُنشئ — الدفع سيُسوّى بعد الاتصال");
      } else {
        toast.error("تعذّر تسوية الدفع", { description: payRes.error });
        return null;
      }
    }

    // Shift counters (best-effort — non-fatal) — server total
    await POSGateway.incrementShiftCounters(
      shift.id,
      shift.total_sales + authoritativeTotal,
      shift.total_orders + 1,
    );
    setShift(s => s ? { ...s, total_sales: s.total_sales + authoritativeTotal, total_orders: s.total_orders + 1 } : s);

    const change = tendered - authoritativeTotal;
    clearCart();
    toast.success(`تم البيع — الباقي ${change.toFixed(2)}`);
    return { change, total: authoritativeTotal, order_id: orderId };
  }, [user, cart, shift, clearCart, sovereignFresh, sovereignHash, sovereignTotal]);

  return {
    // products
    products,
    productsLoading,
    query, setQuery,
    filtered,
    findByBarcode,
    refreshProducts,
    // cart
    cart,
    subtotal,
    sovereignTotal,
    sovereignHash,
    sovereignFresh,
    displayTotal,
    itemCount,
    addProduct,
    incLine,
    decLine,
    removeLine,
    clearCart,
    // shift
    shift,
    shiftLoading,
    openShift,
    closeShift,
    refreshShift,
    canSell: !!shift,
    // tx
    checkout,
    // status
    online,
  };
}
