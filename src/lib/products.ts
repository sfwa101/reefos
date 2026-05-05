// Catalog domain types + legacy compat layer.
// ----------------------------------------------------
// Phase 22.0 — The aggressive nuke removed:
//   • realtime `postgres_changes` subscription on the whole table
//   • `visibilitychange` / `focus` / `online` global refetch listeners
//   • eager `ensureProductsLoaded()` at module-import time
//
// Kept (as a temporary COMPAT shim) until every call-site migrates to
// `useInfiniteCatalog`:
//   • `cache: Product[]` mirror filled by a single lazy fetch
//   • sync helpers: `getById`, `bySource`, `byBadge`, `bySourceAndCategory`
//   • React hooks: `useProducts`, `useProduct`, `useProductsBySource`,
//     `useProductsVersion`
//   • `ensureProductsLoaded`, `refetchProducts`, `registerProducts`
//
// Anything new SHOULD use `useInfiniteCatalog`. These shims exist only
// so the ~50 legacy consumers continue to compile during Phase 22.x.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProductVariant = {
  id: string;
  label: string;
  priceDelta: number;
};
export type ProductAddon = {
  id: string;
  label: string;
  price: number;
};

export type ProductSource =
  | "supermarket" | "kitchen" | "dairy" | "produce" | "recipes"
  | "pharmacy" | "library" | "wholesale" | "home"
  | "village" | "baskets" | "restaurants" | "meat" | "sweets";

export type Product = {
  id: string;
  name: string;
  brand?: string;
  unit: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating?: number;
  category: string;
  subCategory?: string;
  source: ProductSource;
  badge?: "best" | "trending" | "premium" | "new";
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  perishable?: boolean;
  metadata?: Record<string, unknown>;
  description?: string;
};

export type DbRow = {
  id: string; name: string; brand: string | null; unit: string;
  price: number; old_price: number | null;
  image: string | null; image_url: string | null;
  rating: number | null; category: string; sub_category: string | null;
  source: string; badge: string | null;
  variants: unknown; addons: unknown;
  perishable: boolean | null; is_active: boolean;
  metadata: unknown; description: string | null;
};

export const PRODUCT_COLUMNS =
  "id,name,brand,unit,price,old_price,image,image_url,rating,category,sub_category,source,badge,variants,addons,perishable,is_active,metadata,description" as const;

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

export function rowToProduct(row: DbRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    unit: row.unit,
    price: Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : undefined,
    image: row.image_url || row.image || FALLBACK_IMG,
    rating: row.rating != null ? Number(row.rating) : undefined,
    category: row.category,
    subCategory: row.sub_category ?? undefined,
    source: (row.source as ProductSource) ?? "supermarket",
    badge: (row.badge as Product["badge"]) ?? undefined,
    variants: (row.variants as ProductVariant[] | null) ?? undefined,
    addons: (row.addons as ProductAddon[] | null) ?? undefined,
    perishable: row.perishable ?? undefined,
    metadata: (row.metadata && typeof row.metadata === "object")
      ? (row.metadata as Record<string, unknown>)
      : undefined,
    description: row.description ?? undefined,
  };
}

/* ============ Perishability ============ */
const PERISHABLE_SOURCES: ReadonlyArray<ProductSource> = [
  "produce", "dairy", "meat", "kitchen", "recipes", "restaurants", "baskets",
];

export const isPerishable = (p: Product): boolean => {
  if (typeof p.perishable === "boolean") return p.perishable;
  if (PERISHABLE_SOURCES.includes(p.source)) return true;
  if (p.category === "المجمدات") return true;
  if (p.source === "sweets" && (p.subCategory === "تورتات" || p.subCategory === "مثلجات")) return true;
  return false;
};

export const productAvailableInZone = (
  p: Product,
  zoneAcceptsPerishables: boolean,
): boolean => zoneAcceptsPerishables || !isPerishable(p);

/* ============ LEGACY COMPAT SHIM ============
 * Single lazy fetch (no eager kick-off, no realtime, no window listeners).
 * Migration target: replace each consumer with `useInfiniteCatalog`. */

const cache: Product[] = [];
let hydrated = false;
let hydratePromise: Promise<Product[]> | null = null;
const listeners = new Set<() => void>();
const isBrowser = typeof window !== "undefined";

function notify(): void {
  for (const fn of listeners) fn();
}

async function fetchAll(): Promise<Product[]> {
  if (!isBrowser) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(2000);
  if (error) {
    console.error("[products] fetch failed:", error);
    cache.length = 0;
    hydrated = true;
    notify();
    return cache;
  }
  const list = ((data ?? []) as DbRow[]).map(rowToProduct);
  cache.length = 0;
  cache.push(...list);
  hydrated = true;
  notify();
  return list;
}

export function ensureProductsLoaded(): Promise<Product[]> {
  if (!isBrowser) return Promise.resolve([]);
  if (hydrated) return Promise.resolve(cache);
  if (!hydratePromise) hydratePromise = fetchAll();
  return hydratePromise;
}

export async function refetchProducts(): Promise<void> {
  hydratePromise = fetchAll();
  await hydratePromise;
}

export const products: Product[] = cache;

const extraProducts: Product[] = [];
export const registerProducts = (items: Product[]): void => {
  for (const item of items) {
    if (!extraProducts.some((p) => p.id === item.id) && !cache.some((p) => p.id === item.id)) {
      extraProducts.push(item);
    }
  }
};

export const getById = (id: string): Product | undefined =>
  cache.find((p) => p.id === id) ?? extraProducts.find((p) => p.id === id);

export const byBadge = (badge: Product["badge"]): Product[] =>
  cache.filter((p) => p.badge === badge);

export const bySource = (source: ProductSource): Product[] =>
  cache.filter((p) => p.source === source);

export const bySourceAndCategory = (source: ProductSource, category: string): Product[] =>
  cache.filter((p) => p.source === source && p.category === category);

export function useProducts(): { products: Product[]; loading: boolean } {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    void ensureProductsLoaded();
    return () => { listeners.delete(fn); };
  }, []);
  return { products: cache, loading: !hydrated };
}

export function useProduct(id: string | undefined): Product | undefined {
  const { products: all } = useProducts();
  if (!id) return undefined;
  return all.find((p) => p.id === id) ?? extraProducts.find((p) => p.id === id);
}

export function useProductsBySource(source: ProductSource): Product[] {
  const { products: all } = useProducts();
  return all.filter((p) => p.source === source);
}

export function useProductsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const fn = () => setVersion((v) => v + 1);
    listeners.add(fn);
    void ensureProductsLoaded();
    return () => { listeners.delete(fn); };
  }, []);
  return version;
}
