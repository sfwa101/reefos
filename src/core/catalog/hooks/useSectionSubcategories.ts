/**
 * useSectionSubcategories — fetch the distinct subcategory labels used
 * by live Sovereign Assets in a given section.
 *
 * Phase U-1 (Unification Strike): repointed off the legacy `usa_products`
 * table to `salsabil_assets`. Subcategories are derived from the second
 * segment of `category_path` (e.g. "supermarket/dairy/yoghurt" →
 * subcategory pill = "dairy"). Pill `id` doubles as the membership filter
 * value against `Product.metadata.category_path` / `subCategory`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubcategoryItem {
  id: string;
  name: string;
}

export function useSectionSubcategories(sectionSlug: string | undefined) {
  return useQuery({
    queryKey: ["subcategories", sectionSlug],
    queryFn: async (): Promise<SubcategoryItem[]> => {
      if (!sectionSlug) return [];

      const { data } = await supabase
        .from("salsabil_assets")
        .select("category_path")
        .eq("is_active", true)
        .eq("asset_type", "physical")
        .ilike("category_path", `${sectionSlug}/%`);

      if (!data) return [];

      const counts = new Map<string, number>();
      for (const row of data as Array<{ category_path: string | null }>) {
        const path = row.category_path;
        if (!path) continue;
        const segments = path.split("/").filter(Boolean);
        // Second segment = subcategory label (e.g. supermarket/dairy/...).
        const sub = segments[1]?.trim();
        if (!sub) continue;
        counts.set(sub, (counts.get(sub) ?? 0) + 1);
      }

      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 12)
        .map(([id]) => ({ id, name: id }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!sectionSlug,
  });
}
