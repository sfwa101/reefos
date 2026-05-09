/**
 * Home Storefront — domain types.
 *
 * `HGProduct` is now a thin **view-model** derived from a Supabase
 * `Product` row + its `metadata` (Phase 11.2 — Single Source of Truth
 * migration). All UI fields the legacy components used (tagline, badges,
 * fulfillment, depositPct, etaDays, warranty, reviews) are read from
 * `metadata` via the mapper in `./mapper.ts`.
 *
 * `CatId` is now `string` because category labels live in the DB
 * (`sub_category`) — the FILTER mapping in `./dictionaries.ts` matches
 * each pill to the actual sub_category strings.
 */

export type CatId =
  | "all"
  | "majors"
  | "small"
  | "kitchen"
  | "clean"
  | "decor";

export type Fulfillment = "instant" | "preorder";

export type HGProduct = {
  id: string;
  name: string;
  brand: string;
  unit: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: CatId;
  fulfillment: Fulfillment;
  /** for preorder */
  depositPct?: number;
  etaDays?: number;
  tagline: string;
  badges: string[];
  warranty?: string;
  /** Phase 54 — Inventory Triage. */
  stock?: number;
  wakalahEligible?: boolean;
  hideOnZero?: boolean;
  lowStockThreshold?: number;
};

export type Bundle = {
  id: string;
  title: string;
  desc: string;
  itemIds: string[];
  bundlePrice: number;
  badge: string;
};

export type SortId =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "discount";

export type FulfillmentFilter = "all" | "instant" | "preorder";
