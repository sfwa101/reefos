/**
 * useSectionSubcategories — fetch the distinct subcategory labels used
 * by live products in a given section, straight from the DB.
 *
 * NOTE: `usa_products` has no `sub_category` column. The closest real
 * signal is the `tags` text[] array, so we aggregate unique tag values
 * per section and surface them as subcategory pills. The pill `id` is
 * the raw tag string — used for the label AND for direct membership
 * filtering against `Product.metadata.tags`.
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

      const { data: section } = await supabase
        .from("sections")
        .select("id")
        .eq("slug", sectionSlug)
        .maybeSingle();

      if (!section) return [];

      const { data } = await supabase
        .from("usa_products")
        .select("tags")
        .eq("section_id", section.id)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (!data) return [];

      const counts = new Map<string, number>();
      for (const row of data as Array<{ tags: string[] | null }>) {
        for (const t of row.tags ?? []) {
          if (typeof t !== "string") continue;
          const v = t.trim();
          if (!v) continue;
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
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
