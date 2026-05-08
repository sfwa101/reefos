/**
 * SDUI Engine — Shared Types (kernel-owned)
 * -----------------------------------------
 * Phase VIII-Restoration · V-1 Part A:
 * These types previously lived inside `apps/reef-al-madina` and were
 * imported back by the kernel — a forbidden app→kernel coupling.
 * They are now owned by the kernel; apps re-export from here.
 *
 * Mirrors `public.ui_layouts`. The Admin ERP edits `section_order`
 * (which sections render and in what order) and `section_config`
 * (per-section style/behaviour overrides) without code changes.
 */

export type SectionKey =
  | "HeroBanner"
  | "CategoriesGrid"
  | "FlashDeals"
  | "BestSellersRail"
  | "BundlesRail"
  | "ProductsGrid"
  | "SearchAndFilters"
  // Phase 26 — Main Hub stem cells
  | "MainSearchHeader"
  | "StoryCircles"
  | "PromotionSlider"
  | "DepartmentGrid"
  // Phase 22 — Minimalist Re-Genesis sections
  | "SmartGreeting"
  | "AmanahTierProgress"
  | "PersonalizedDealsRail"
  | "BuyAgainRail"
  | "QuickMealsRail"
  // Phase 26 — Sovereign Minimalism
  | "OfferNeighborhoodPool"
  | "PredictiveRefillRail";

export type SectionConfig = {
  /** when false, the section is hidden even if listed in `section_order` */
  enabled?: boolean;
  /** Per-section style overrides — interpreted by individual sections. */
  variant?: string;
  padding?: "sm" | "md" | "lg";
  tone?: "primary" | "accent" | "info" | "success" | "warning" | "teal";
  sticky?: boolean;
  hue?: string;
  showTimer?: boolean;
  density?: "compact" | "comfortable" | "spacious";
};

export type LayoutStatus = "draft" | "published";

export type UiLayout = {
  id: string;
  page_key: string;
  section_order: SectionKey[];
  section_config: Partial<Record<SectionKey, SectionConfig>>;
  /** Per-section custom display titles (Arabic). */
  section_titles?: Partial<Record<SectionKey, string>>;
  is_active: boolean;
  status?: LayoutStatus;
  version?: number;
  title?: string | null;
};
