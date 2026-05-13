/**
 * BlockRecipes — Capability-Driven Stem Cell Morphing (Phase SC-1.1).
 *
 * Article 15.1 enforcement: the body of every storefront vertical is
 * synthesized from its `SectionIdentity.layoutVariant` + `capabilities`,
 * NOT from a hardcoded global skeleton or cloned `ui_layouts` rows.
 *
 * Resolution order:
 *   1. `layoutVariant` recipe (highest priority — bespoke shells)
 *   2. Per-slug "flavor" recipe (visual differentiation)
 *   3. Capability augmentation (idempotent block inserts)
 *
 * The output is consumed by `LayoutFactory` which uses it to OVERRIDE
 * any cancerous DB row that would otherwise serve the generic shell.
 */
import type {
  SectionConfig,
  SectionKey,
  UiLayout,
} from "@/core/runtime-ui/sdui/types";
import { CAP } from "@/core/capabilities";
import type { SectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";

export interface BlockRecipe {
  section_order: SectionKey[];
  section_config?: Partial<Record<SectionKey, SectionConfig>>;
}

const BASE_COMMERCE: SectionKey[] = [
  "SearchAndFilters",
  "CategoriesGrid",
  "ProductsGrid",
];

/** Variant-level recipes — highest priority, bespoke domain shells. */
const VARIANT_RECIPES: Record<string, BlockRecipe> = {
  "meal-menu": {
    section_order: [
      "SearchAndFilters",
      "QuickMealsRail",
      "CategoriesGrid",
      "BestSellersRail",
      "ProductsGrid",
    ],
  },
  "restaurant-list": {
    section_order: ["SduiMenuList"],
    section_config: { SduiMenuList: { variant: "restaurants" } },
  },
  "subscription-builder": {
    section_order: ["SduiWizardChain"],
    section_config: { SduiWizardChain: { variant: "subscriptions" } },
  },
};

/**
 * Per-slug flavor recipes — give each vertical a recognisable rhythm
 * even when capabilities overlap. These are the "standard" variant
 * defaults; capability augmentation runs on top.
 */
const SLUG_RECIPES: Record<string, SectionKey[]> = {
  produce: [
    "SearchAndFilters",
    "CategoriesGrid",
    "BuyAgainRail",
    "BestSellersRail",
    "ProductsGrid",
  ],
  dairy: [
    "SearchAndFilters",
    "CategoriesGrid",
    "BuyAgainRail",
    "ProductsGrid",
  ],
  meat: [
    "SearchAndFilters",
    "CategoriesGrid",
    "BundlesRail",
    "ProductsGrid",
  ],
  sweets: [
    "SearchAndFilters",
    "PersonalizedDealsRail",
    "CategoriesGrid",
    "ProductsGrid",
  ],
  pharmacy: [
    "SearchAndFilters",
    "CategoriesGrid",
    "BestSellersRail",
    "ProductsGrid",
  ],
  village: [
    "SearchAndFilters",
    "StoryCircles",
    "CategoriesGrid",
    "ProductsGrid",
  ],
  recipes: [
    "SearchAndFilters",
    "BundlesRail",
    "CategoriesGrid",
    "ProductsGrid",
  ],
  "ice-cream": [
    "SearchAndFilters",
    "QuickMealsRail",
    "CategoriesGrid",
    "ProductsGrid",
  ],
  "crepes-fries": [
    "SearchAndFilters",
    "QuickMealsRail",
    "CategoriesGrid",
    "ProductsGrid",
  ],
  "home-goods": [
    "SearchAndFilters",
    "CategoriesGrid",
    "BundlesRail",
    "BestSellersRail",
    "ProductsGrid",
  ],
  home: [
    "SearchAndFilters",
    "CategoriesGrid",
    "BundlesRail",
    "BestSellersRail",
    "ProductsGrid",
  ],
  supermarket: [
    "SearchAndFilters",
    "CategoriesGrid",
    "BestSellersRail",
    "BundlesRail",
    "ProductsGrid",
  ],
  wholesale: [
    "SearchAndFilters",
    "BundlesRail",
    "CategoriesGrid",
    "ProductsGrid",
  ],
  "school-library": [
    "SearchAndFilters",
    "CategoriesGrid",
    "BundlesRail",
    "ProductsGrid",
  ],
};

function insertAfter(
  order: SectionKey[],
  key: SectionKey,
  anchor?: SectionKey,
): SectionKey[] {
  if (order.includes(key)) return order;
  if (anchor && order.includes(anchor)) {
    const i = order.indexOf(anchor);
    return [...order.slice(0, i + 1), key, ...order.slice(i + 1)];
  }
  return [...order, key];
}

/** Build a recipe for an identity using variant → slug → capabilities. */
export function recipeForIdentity(identity: SectionIdentity): BlockRecipe {
  // 1) Variant-driven shells take precedence.
  const variantRecipe = VARIANT_RECIPES[identity.layoutVariant];
  if (variantRecipe) return variantRecipe;

  // 2) Slug-flavored "standard" baseline.
  let order: SectionKey[] = SLUG_RECIPES[identity.slug]
    ? [...SLUG_RECIPES[identity.slug]]
    : [...BASE_COMMERCE];

  // 3) Capability augmentation — idempotent inserts.
  const caps = new Set<string>(identity.capabilities ?? []);
  if (caps.has(CAP.WHOLESALE)) order = insertAfter(order, "BundlesRail", "CategoriesGrid");
  if (caps.has(CAP.MEAL_MODE)) order = insertAfter(order, "QuickMealsRail", "SearchAndFilters");
  if (caps.has(CAP.SUBSCRIPTION)) order = insertAfter(order, "PredictiveRefillRail", "ProductsGrid");
  if (caps.has(CAP.QUICK_BUY)) order = insertAfter(order, "BuyAgainRail", "CategoriesGrid");

  return { section_order: order };
}

/**
 * Synthesize a `UiLayout` shell directly from identity, bypassing the
 * cancerous DB rows that currently clone the same skeleton across every
 * `category_*` page_key.
 */
export function synthesizeLayoutFromIdentity(
  identity: SectionIdentity,
  pageKey: string,
): UiLayout {
  const recipe = recipeForIdentity(identity);
  return {
    id: `recipe:${identity.slug}`,
    page_key: pageKey,
    section_order: recipe.section_order,
    section_config: (recipe.section_config ?? {}) as UiLayout["section_config"],
    section_titles: {},
    is_active: true,
    status: "published",
  };
}
