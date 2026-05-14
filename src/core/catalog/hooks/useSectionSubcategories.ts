/**
 * useSectionSubcategories — fetch the distinct subcategory labels used
 * by live Sovereign Assets in a given section.
 *
 * Wave P-3 Sub-Wave 11: Supabase access routed through
 * SovereignCatalogGateway. Subcategories are derived from the second
 * segment of `category_path` (e.g. "supermarket/dairy/yoghurt" →
 * subcategory pill = "dairy"). Pill `id` doubles as the membership
 * filter value against `Product.metadata.category_path` / `subCategory`.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchSectionCategoryPaths } from "@/core/catalog/gateway/SovereignCatalogGateway";

export interface SubcategoryItem {
  id: string;
  name: string;
}

export function useSectionSubcategories(sectionSlug: string | undefined) {
  return useQuery({
    queryKey: ["subcategories", sectionSlug],
    queryFn: async (): Promise<SubcategoryItem[]> => {
      if (!sectionSlug) return [];
      const paths = await fetchSectionCategoryPaths(sectionSlug);
      const counts = new Map<string, number>();
      for (const path of paths) {
        const segments = path.split("/").filter(Boolean);
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
