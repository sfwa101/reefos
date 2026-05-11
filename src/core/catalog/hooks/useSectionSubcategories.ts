/**
 * useSectionSubcategories — fetch the distinct `sub_category` strings
 * used by live products in a given section, straight from the DB.
 *
 * This replaces the hardcoded `CATS` list (which was Home-Goods specific)
 * for every other section. Returns the raw Arabic strings as both `id`
 * and `name` — used for the pill label AND for direct equality
 * filtering against `Product.subCategory`.
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
        .select("sub_category")
        .eq("section_id", section.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .not("sub_category", "is", null)
        .order("sub_category");

      if (!data) return [];

      const unique = Array.from(
        new Set(
          data
            .map((r) => (r as { sub_category: string | null }).sub_category)
            .filter((s): s is string => !!s && s.trim().length > 0),
        ),
      );
      return unique.map((s) => ({ id: s, name: s }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!sectionSlug,
  });
}
