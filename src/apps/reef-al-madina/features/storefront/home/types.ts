/**
 * Home Storefront — domain types.
 *
 * Wave P-A (Storefront Purity) — the legacy view-model has been eradicated.
 * been eradicated. Home components now consume the canonical
 * `ProductCardVM` from `@/core/catalog/types` directly, with the
 * `homeProductCardAdapter` in `./adapter.ts` handling translation to
 * the home-specific filter axes (`CatId`, `Fulfillment`).
 *
 * `CatId` remains here transitionally as the legacy filter pill axis;
 * Wave P-C will replace it with capability-driven filters sourced from
 * the section registry.
 */

export type CatId =
  | "all"
  | "majors"
  | "small"
  | "kitchen"
  | "clean"
  | "decor";

export type Fulfillment = "instant" | "preorder";

export type Bundle = {
  id: string;
  title: string;
  desc: string;
  itemIds: string[];
  bundlePrice: number;
  badge: string;
};

// Sort + fulfillment filter axes are owned by the kernel contract
// (Constitution v5.1 Article 2). Re-exported here for app-side ergonomics.
export type { SortId, FulfillmentFilter } from "@/core/contracts/home-orchestrator";
