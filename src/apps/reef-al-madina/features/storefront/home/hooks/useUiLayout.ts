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

// Reef Al-Madina main consumer storefront fallback (Phase 22 — Minimalist
// Re-Genesis). Even in offline / DB-failure mode, the OS ascends to the
// Emperor's preferred minimalist face — NO banners, NO story circles, NO
// grid overload — only the Sovereign rails of identity + intent.
const DEFAULT_REEF_HOME_ORDER: SectionKey[] = [
  "SmartGreeting",
  "AmanahTierProgress",
  "PersonalizedDealsRail",
  "BuyAgainRail",
  "QuickMealsRail",
];

function fallbackOrderFor(pageKey: string): SectionKey[] {
  return pageKey === "reef_home" ? DEFAULT_REEF_HOME_ORDER : DEFAULT_HOME_ORDER;
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
    // Fallback: never render blank.
    return {
      id: "fallback",
      page_key: pageKey,
      section_order: fallbackOrderFor(pageKey),
      section_config: {},
      section_titles: {},
      is_active: true,
      status: "published",
    };
  }, [query.data, query.isLoading, pageKey]);

  return { layout, loading: query.isLoading };
};

export { DEFAULT_HOME_ORDER };
