/**
 * Home Storefront — Product → HGProduct view-model mapper.
 *
 * Converts the canonical Supabase `Product` (with rich `metadata`) into
 * the legacy `HGProduct` shape consumed by the existing components, so
 * we delete `data.ts` (single source of truth = DB) without rewriting
 * 8 leaf components.
 */
import type { Product } from "@/lib/products";
import { CAT_TO_SUBCAT } from "./dictionaries";
import type { CatId, Fulfillment, HGProduct } from "./types";

type HomeMeta = {
  brand?: string;
  tagline?: string;
  badges?: string[];
  fulfillment?: Fulfillment;
  depositPct?: number;
  etaDays?: number;
  warranty?: string;
  reviews?: number;
};

const asHomeMeta = (m: Product["metadata"]): HomeMeta => {
  if (!m || typeof m !== "object") return {};
  const safe = m as Record<string, unknown>;
  const out: HomeMeta = {};
  if (typeof safe.brand === "string") out.brand = safe.brand;
  if (typeof safe.tagline === "string") out.tagline = safe.tagline;
  if (Array.isArray(safe.badges))
    out.badges = safe.badges.filter((b): b is string => typeof b === "string");
  if (safe.fulfillment === "instant" || safe.fulfillment === "preorder")
    out.fulfillment = safe.fulfillment;
  if (typeof safe.depositPct === "number") out.depositPct = safe.depositPct;
  if (typeof safe.etaDays === "number") out.etaDays = safe.etaDays;
  if (typeof safe.warranty === "string") out.warranty = safe.warranty;
  if (typeof safe.reviews === "number") out.reviews = safe.reviews;
  return out;
};

/** Resolve a DB `sub_category` to one of the UI CatId pills. */
const subCatToCatId = (subCat: string | undefined): CatId => {
  if (!subCat) return "all";
  for (const [catId, subs] of Object.entries(CAT_TO_SUBCAT)) {
    if (subs.includes(subCat)) return catId as CatId;
  }
  return "all";
};

export const productToHGView = (p: Product): HGProduct => {
  const meta = asHomeMeta(p.metadata);
  return {
    id: p.id,
    name: p.name,
    brand: meta.brand ?? p.brand ?? "Reef Home",
    unit: p.unit,
    price: p.price,
    oldPrice: p.oldPrice,
    image: p.image,
    rating: p.rating ?? 4.7,
    reviews: meta.reviews ?? 0,
    category: subCatToCatId(p.subCategory),
    fulfillment: meta.fulfillment ?? "instant",
    depositPct: meta.depositPct,
    etaDays: meta.etaDays,
    tagline: meta.tagline ?? "",
    badges: meta.badges ?? [],
    warranty: meta.warranty,
  };
};
