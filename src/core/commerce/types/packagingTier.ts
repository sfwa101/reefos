/**
 * Economic Packaging Runtime — Phase D-1
 * TypeScript shape for `public.salsabil_packaging_tiers`.
 *
 * Recursive packaging tree per asset, e.g.:
 *   Pallet → Carton → Bucket(5KG) → Kilogram → Gram
 *
 * Authoritative source = DB row. Do not mutate `conversion_to_base` manually;
 * it is denormalized at write time from the parent chain.
 */
export interface PackagingTier {
  id: string;
  asset_id: string;
  parent_tier_id: string | null;
  tier_label: string;
  uom_code: string | null;
  conversion_to_parent: number;
  conversion_to_base: number;
  barcode: string | null;
  price_override: number | null;
  is_stock_keeping: boolean;
  is_default_sell: boolean;
  is_default_buy: boolean;
  is_active: boolean;
  sort_order: number;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Draft shape used by admin forms (no server-managed fields). */
export type PackagingTierDraft = Omit<
  PackagingTier,
  "id" | "created_at" | "updated_at" | "conversion_to_base"
> & {
  id?: string;
  conversion_to_base?: number;
};

/** A node in the resolved packaging tree, with children attached. */
export interface PackagingTierNode extends PackagingTier {
  children: PackagingTierNode[];
}
