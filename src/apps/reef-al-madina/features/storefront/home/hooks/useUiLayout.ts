/**
 * useUiLayout — fetches a `ui_layouts` row by `page_key` for the customer
 * runtime. Defaults to the published version. When `?preview=draft` is
 * present in the URL, falls back to the draft so admins can preview.
 *
 * Falls back to a sane default order when the row is missing so the
 * storefront NEVER renders blank. Public RLS read = anonymous-safe.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LayoutStatus, SectionKey, UiLayout } from "../types/sdui.types";

// Generic category fallback (Meat, Sweets, Pharmacy, Home Goods, etc.)
const DEFAULT_HOME_ORDER: SectionKey[] = [
  "HeroBanner",
  "SearchAndFilters",
  "CategoriesGrid",
  "BundlesRail",
  "BestSellersRail",
  "ProductsGrid",
];

// Reef Al-Madina main consumer storefront fallback (Phase 26 — Sovereign
// Minimalism). The Pastel Minimalist DNA is hard-coded here so NO regression
// can leak in via DB downtime, cache miss, or migration drift. This sequence
// is the Emperor's locked Golden Order.
const DEFAULT_REEF_HOME_ORDER: SectionKey[] = [
  "SmartGreeting",
  "MainSearchHeader",
  "StoryCircles",
  "OfferNeighborhoodPool",
  "PredictiveRefillRail",
];

// Phase 28 — Sections (departments_hub) ascended to the Level-4 Matrix.
const DEFAULT_DEPARTMENTS_HUB_ORDER: SectionKey[] = [
  "MainSearchHeader",
  "DepartmentGrid",
];

// Phase 29 — Sovereign Unification: Offers, Maeen and category storefronts
// ascended to the Level-4 Matrix with locked Golden Orders.
const DEFAULT_OFFERS_HUB_ORDER: SectionKey[] = ["SpatioTemporalOffersRail"];
const DEFAULT_MAEEN_HUB_ORDER: SectionKey[] = ["MaeenLauncherGrid"];
const DEFAULT_CATEGORY_ORDER: SectionKey[] = [
  "SearchAndFilters",
  "CategoriesGrid",
  "BundlesRail",
  "BestSellersRail",
  "ProductsGrid",
];

// Phase 30 — Advanced Stem Cell Ascendancy: complex domain pages.
// Each fallback is a single-section locked order driven by the primitive's
// `variant` config. Even when the DB row is missing the page renders
// correctly because the primitive itself defaults to its only variant.
const DEFAULT_RESTAURANTS_ORDER: SectionKey[] = ["SduiMenuList"];
const DEFAULT_SUBSCRIPTIONS_ORDER: SectionKey[] = ["SduiWizardChain"];
const DEFAULT_BASKETS_ORDER: SectionKey[] = ["SduiWizardChain"];
const DEFAULT_WHOLESALE_ORDER: SectionKey[] = ["SduiComparisonGrid"];
const DEFAULT_COMPARE_HG_ORDER: SectionKey[] = ["SduiComparisonGrid"];
const DEFAULT_SCHOOL_LIBRARY_ORDER: SectionKey[] = ["SduiWizardChain"];

// Locked variant fallbacks per page so the wizard/comparison primitives
// know which concrete domain to render when the DB config is unavailable.
const VARIANT_FALLBACK: Record<string, { section: SectionKey; variant: string }> = {
  reef_restaurants: { section: "SduiMenuList", variant: "restaurants" },
  reef_subscriptions: { section: "SduiWizardChain", variant: "subscriptions" },
  reef_baskets: { section: "SduiWizardChain", variant: "baskets" },
  reef_wholesale: { section: "SduiComparisonGrid", variant: "wholesale" },
  reef_compare_home_goods: { section: "SduiComparisonGrid", variant: "compare_home_goods" },
  reef_school_library: { section: "SduiWizardChain", variant: "school_library" },
};

function fallbackOrderFor(pageKey: string): SectionKey[] {
  if (pageKey === "reef_home") return DEFAULT_REEF_HOME_ORDER;
  if (pageKey === "departments_hub") return DEFAULT_DEPARTMENTS_HUB_ORDER;
  if (pageKey === "offers_hub") return DEFAULT_OFFERS_HUB_ORDER;
  if (pageKey === "maeen_hub") return DEFAULT_MAEEN_HUB_ORDER;
  if (pageKey === "reef_restaurants") return DEFAULT_RESTAURANTS_ORDER;
  if (pageKey === "reef_subscriptions") return DEFAULT_SUBSCRIPTIONS_ORDER;
  if (pageKey === "reef_baskets") return DEFAULT_BASKETS_ORDER;
  if (pageKey === "reef_wholesale") return DEFAULT_WHOLESALE_ORDER;
  if (pageKey === "reef_compare_home_goods") return DEFAULT_COMPARE_HG_ORDER;
  if (pageKey === "reef_school_library") return DEFAULT_SCHOOL_LIBRARY_ORDER;
  if (pageKey.startsWith("category_")) return DEFAULT_CATEGORY_ORDER;
  return DEFAULT_HOME_ORDER;
}

function readPreviewMode(): LayoutStatus {
  if (typeof window === "undefined") return "published";
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("preview") === "draft" ? "draft" : "published";
  } catch {
    return "published";
  }
}

async function fetchUiLayout(pageKey: string, status: LayoutStatus): Promise<UiLayout | null> {
  let { data } = await supabase
    .from("ui_layouts")
    .select("id,page_key,section_order,section_config,section_titles,is_active,status,version,title")
    .eq("page_key", pageKey)
    .eq("status", status)
    .eq("is_active", true)
    .maybeSingle();

  if (!data && status === "draft") {
    const r = await supabase
      .from("ui_layouts")
      .select("id,page_key,section_order,section_config,section_titles,is_active,status,version,title")
      .eq("page_key", pageKey)
      .eq("status", "published")
      .eq("is_active", true)
      .maybeSingle();
    data = r.data;
  }

  return data ? (data as unknown as UiLayout) : null;
}

export const useUiLayout = (pageKey: string, statusOverride?: LayoutStatus) => {
  const status: LayoutStatus = statusOverride ?? readPreviewMode();

  const query = useQuery({
    queryKey: ["ui_layouts", pageKey, status],
    queryFn: () => fetchUiLayout(pageKey, status),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const layout = useMemo<UiLayout | null>(() => {
    if (query.data) return query.data;
    if (query.isLoading) return null;
    // Fallback: never render blank. Inject the locked variant into
    // section_config so the Phase 30 primitives know which concrete
    // domain to render even without a DB row.
    const variantFb = VARIANT_FALLBACK[pageKey];
    const section_config = variantFb
      ? { [variantFb.section]: { variant: variantFb.variant } }
      : {};
    return {
      id: "fallback",
      page_key: pageKey,
      section_order: fallbackOrderFor(pageKey),
      section_config: section_config as UiLayout["section_config"],
      section_titles: {},
      is_active: true,
      status: "published",
    };
  }, [query.data, query.isLoading, pageKey]);

  return { layout, loading: query.isLoading };
};

export { DEFAULT_HOME_ORDER };
