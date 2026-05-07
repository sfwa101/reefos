import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { PosCartLine, PosProduct, PosShift } from "../types/pos.types";

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

  // Load products (cached, then fresh)
  const refreshProducts = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("products")
      .select("id,name,price,stock,is_active,barcode,image_url,category")
      .eq("is_active", true)
      .order("name")
      .limit(2000);
    if (error) { toast.error("تعذّر تحميل المنتجات"); return; }
    const rows = (data ?? []) as PosProduct[];
    setProducts(rows);
    saveCache(rows);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("pos_shifts")
      .select("*")
      .eq("cashier_id", user.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error(error); return; }
    setShift((data ?? null) as PosShift | null);
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

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

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
          if (p) { e.preventDefault(); addProduct(p); toast.success(`+ ${p.name}`); }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("pos_shifts")
      .insert({ cashier_id: user.id, branch_id: branchId, opening_balance: openingBalance })
      .select("*").single();
    if (error) { toast.error("تعذّر فتح الورديّة", { description: error.message }); return null; }
    setShift(data as PosShift);
    toast.success("تم فتح الورديّة");
    return data as PosShift;
  }, [user]);

  const closeShift = useCallback(async (actualBalance: number) => {
    if (!shift) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("close_pos_shift", { _shift_id: shift.id, _actual_balance: actualBalance });
    if (error) { toast.error("تعذّر إغلاق الورديّة", { description: error.message }); return null; }
    setShift(null);
    toast.success("تم إغلاق الورديّة");
    return data as PosShift;
  }, [shift]);

  // Checkout: increments shift counters; sale persistence belongs to existing order pipeline
  const checkout = useCallback(async (tendered: number) => {
    if (!shift) { toast.error("افتح ورديّة أولاً"); return null; }
    if (cart.length === 0) { toast.error("السلة فارغة"); return null; }
    if (tendered < subtotal) { toast.error("المبلغ المدفوع أقل من المطلوب"); return null; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("pos_shifts")
      .update({
        total_sales: shift.total_sales + subtotal,
        total_orders: shift.total_orders + 1,
      })
      .eq("id", shift.id);
    if (error) { toast.error("تعذّر تسجيل البيع", { description: error.message }); return null; }
    setShift(s => s ? { ...s, total_sales: s.total_sales + subtotal, total_orders: s.total_orders + 1 } : s);
    const change = tendered - subtotal;
    clearCart();
    toast.success(`تم البيع — الباقي ${change.toFixed(2)}`);
    return { change, total: subtotal };
  }, [cart.length, shift, subtotal, clearCart]);

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
