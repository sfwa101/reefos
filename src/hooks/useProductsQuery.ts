// TanStack Query layer over the Sovereign Catalog.
// ----------------------------------------------------
// Phase 15.1 — THE SDUI CATALOG CUTOVER.
//
// The legacy `public.products` table is DEAD. This hook now reads
// directly from the Universal Sovereign Catalog:
//
//   salsabil_assets ─┬─ salsabil_skus ─── salsabil_inventory_matrix
//                    └── salsabil_financial_contracts (priced per SKU)
//
// We map the Sovereign rows back to the existing `Product` shape so
// every UI card that consumes `useProductsQuery` keeps working without
// modification. The legacy ID format `usa_<uuid-no-dashes>` is preserved
// — that's the bridge format the cart, order history, and "Buy It Again"
// surfaces all already expect.

import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCTS_QUERY_KEY,
  type Product,
  type ProductSource,
  type ProductVariant,
  type ProductAddon,
} from "@/lib/products";

const STALE_MS = 60_000;
const GC_MS = 5 * 60_000;
const isBrowser = typeof window !== "undefined";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

const toLegacyId = (assetId: string): string =>
  `usa_${assetId.replace(/-/g, "")}`;

const pickImage = (media: unknown): string => {
  if (Array.isArray(media) && media.length > 0) {
    const first = media[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const rec = first as Record<string, unknown>;
      const url = (rec.url ?? rec.src ?? rec.path) as string | undefined;
      if (url) return url;
    }
  }
  if (media && typeof media === "object") {
    const rec = media as Record<string, unknown>;
    const url = (rec.url ?? rec.src) as string | undefined;
    if (url) return url;
  }
  return FALLBACK_IMG;
};

const sourceFromCategory = (path: string | null): ProductSource => {
  if (!path) return "supermarket";
  const head = path.split("/")[0]?.toLowerCase() ?? "";
  const map: Record<string, ProductSource> = {
    supermarket: "supermarket",
    kitchen: "kitchen",
    dairy: "dairy",
    produce: "produce",
    recipes: "recipes",
    pharmacy: "pharmacy",
    library: "library",
    wholesale: "wholesale",
    home: "home",
    village: "village",
    baskets: "baskets",
    restaurants: "restaurants",
    meat: "meat",
    sweets: "sweets",
  };
  return map[head] ?? "supermarket";
};

type SovereignRow = {
  id: string;
  name: string;
  description: string | null;
  category_path: string | null;
  traits: Record<string, unknown> | null;
  media: unknown;
  salsabil_skus: Array<{
    id: string;
    sku_code: string;
    attributes: Record<string, unknown> | null;
    sort_order: number | null;
    is_active: boolean | null;
    salsabil_financial_contracts: Array<{
      base_price: number | string | null;
      currency: string | null;
    }> | null;
    salsabil_inventory_matrix: Array<{
      availability_data: Record<string, unknown> | null;
    }> | null;
  }> | null;
};

function rowToProduct(row: SovereignRow): Product | null {
  const skus = row.salsabil_skus ?? [];
  // Pick first active SKU (lowest sort_order). If none, skip.
  const ordered = [...skus].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const primary = ordered.find((s) => s.is_active !== false) ?? ordered[0];
  if (!primary) return null;

  const contract = primary.salsabil_financial_contracts?.[0];
  const price = contract?.base_price != null ? Number(contract.base_price) : 0;

  const traits = row.traits ?? {};
  const oldPriceRaw = (traits as Record<string, unknown>).old_price;
  const oldPrice =
    typeof oldPriceRaw === "number"
      ? oldPriceRaw
      : typeof oldPriceRaw === "string"
        ? Number(oldPriceRaw)
        : undefined;

  const attrs = primary.attributes ?? {};
  const unit =
    (attrs.unit as string | undefined) ??
    (attrs.size as string | undefined) ??
    (traits.unit as string | undefined) ??
    "وحدة";

  const brand = (traits.brand as string | undefined) ?? undefined;
  const badge = (traits.badge as Product["badge"]) ?? undefined;
  const rating =
    typeof traits.rating === "number" ? (traits.rating as number) : undefined;
  const subCategory =
    row.category_path && row.category_path.includes("/")
      ? row.category_path.split("/").slice(1).join("/")
      : undefined;
  const category =
    row.category_path?.split("/")[0] ??
    (traits.category as string | undefined) ??
    "general";

  return {
    id: toLegacyId(row.id),
    name: row.name,
    brand,
    unit,
    price,
    oldPrice: oldPrice && Number.isFinite(oldPrice) ? oldPrice : undefined,
    image: pickImage(row.media),
    rating,
    category,
    subCategory,
    source: sourceFromCategory(row.category_path),
    badge,
    variants: (traits.variants as ProductVariant[] | undefined) ?? undefined,
    addons: (traits.addons as ProductAddon[] | undefined) ?? undefined,
    perishable: (traits.perishable as boolean | undefined) ?? undefined,
    metadata: {
      ...(traits as Record<string, unknown>),
      usa_asset_id: row.id,
      usa_sku_id: primary.id,
    },
    description: row.description ?? undefined,
  };
}

const SOVEREIGN_SELECT = `
  id, name, description, category_path, traits, media,
  salsabil_skus (
    id, sku_code, attributes, sort_order, is_active,
    salsabil_financial_contracts ( base_price, currency ),
    salsabil_inventory_matrix ( availability_data )
  )
`;

async function fetchAllProducts(): Promise<Product[]> {
  if (!isBrowser) return [];
  const { data, error } = await supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .eq("is_active", true)
    .eq("asset_type", "physical")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[catalog] sovereign fetch failed:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as SovereignRow[];
  return rows
    .map(rowToProduct)
    .filter((p): p is Product => p != null);
}

export const productsQueryOptions = () =>
  queryOptions({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: fetchAllProducts,
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

/** SWR-cached full Sovereign catalog. */
export function useProductsQuery() {
  return useQuery(productsQueryOptions());
}

/** SWR-cached subset filtered by storefront source. */
export function useProductsBySourceQuery(source: ProductSource) {
  return useQuery({
    ...productsQueryOptions(),
    select: (all) => all.filter((p) => p.source === source),
  });
}

/** SWR-cached single product lookup by id. */
export function useProductQuery(id: string | undefined) {
  return useQuery({
    ...productsQueryOptions(),
    enabled: Boolean(id),
    select: (all) => (id ? all.find((p) => p.id === id) : undefined),
  });
}

/* ── Cold-start fast path (source-aware, capped) ── */
async function fetchHomeProducts(
  limit: number,
  source?: ProductSource,
): Promise<Product[]> {
  if (!isBrowser) return [];
  let q = supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .eq("is_active", true)
    .eq("asset_type", "physical")
    .order("created_at", { ascending: false })
    .limit(limit * 2); // overfetch; we filter by source after mapping
  if (source) {
    // category_path's leading segment encodes the source.
    q = q.ilike("category_path", `${source}%`);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[useHomeProductsQuery] sovereign fetch failed:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as SovereignRow[];
  const mapped = rows
    .map(rowToProduct)
    .filter((p): p is Product => p != null);
  const filtered = source ? mapped.filter((p) => p.source === source) : mapped;
  const sliced = filtered.slice(0, limit);
  if (sliced.length === 0) {
    // Failsafe: never render an empty shelf while DB seeding is in flight.
    return MOCK_PRODUCTS(source, Math.min(limit, 4));
  }
  return sliced;
}

const MOCK_IMG = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},70%,85%)'/><stop offset='1' stop-color='hsl(${hue},70%,70%)'/></linearGradient></defs><rect width='200' height='200' fill='url(%23g)'/></svg>`,
  )}`;

const MOCK_PRODUCTS = (source: ProductSource | undefined, count: number): Product[] => {
  const src: ProductSource = source ?? "supermarket";
  const samples = [
    { name: "منتج طازج", price: 25, hue: 140 },
    { name: "اختيار اليوم", price: 45, hue: 30 },
    { name: "عرض موفر", price: 60, hue: 200 },
    { name: "الأكثر طلباً", price: 35, hue: 350 },
  ];
  return samples.slice(0, count).map((s, i) => ({
    id: `mock_${src}_${i}`,
    name: s.name,
    unit: "وحدة",
    price: s.price,
    image: MOCK_IMG(s.hue),
    category: src,
    source: src,
  }));
};

export const homeProductsQueryOptions = (limit = 48, source?: ProductSource) =>
  queryOptions({
    queryKey: ["catalog", "home-products", source ?? "all", limit] as const,
    queryFn: () => fetchHomeProducts(limit, source),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

export function useHomeProductsQuery(limit = 48, source?: ProductSource) {
  return useQuery(homeProductsQueryOptions(limit, source));
}
