/**
 * useFeaturedCategories — DB-driven hook for the home Story Circles rail.
 *
 * Reads ROOT-LEVEL categories (parent_id IS NULL) ordered by sort_order
 * from the public.categories table. These represent the "featured"
 * top-level departments (Supermarket, Produce, Dairy, Meat, Kitchen,
 * Recipes, Restaurants, Sweets, Baskets, ...).
 *
 * Each row is enriched with:
 *   - `to`: a deterministic storefront route (`/store/{slug}`) derived from
 *     the matching ProductSource (stable mapping below).
 *   - `ringFrom` / `ringTo`: stable HSL gradient pair derived from the
 *     category id hash, so visuals stay consistent across reloads without
 *     polluting the DB schema.
 *
 * NOTE: Once the `categories` table grows `is_featured` / `slug` columns,
 *       this hook is the single point that needs updating — call sites
 *       remain unchanged.
 */
import { useQuery } from "@tanstack/react-query";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";

export type FeaturedCategory = {
  id: string;
  name: string;
  emoji: string;
  to: string;
  ringFrom: string;
  ringTo: string;
};

type Row = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
  parent_id: string | null;
};

/** Maps the canonical category name (Arabic) to its storefront route.
 *  Falls back to /sections for any unmapped category. */
const NAME_TO_ROUTE: Record<string, string> = {
  "السوبرماركت": "/store/supermarket",
  "خضار وفواكه": "/store/produce",
  "ألبان وبيض": "/store/dairy",
  "لحوم وأسماك": "/store/meat",
  "المطبخ": "/store/kitchen",
  "وصفات": "/store/recipes",
  "مطاعم": "/store/restaurants",
  "حلويات": "/store/sweets",
  "سلال": "/store/baskets",
  "صيدلية": "/store/pharmacy",
  "مكتبة": "/store/library",
  "القرية": "/store/village",
  "جملة": "/store/wholesale",
  "أدوات منزلية": "/store/home",
};

/** Deterministic hash → 0..359 hue */
const hueFromId = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 360;
};

const FALLBACK_EMOJI = "✨";

export const useFeaturedCategoriesQuery = () =>
  useQuery({
    queryKey: ["categories", "featured-root"] as const,
    queryFn: async (): Promise<FeaturedCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, sort_order, parent_id")
        .is("parent_id", null)
        .order("sort_order", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return ((data ?? []) as Row[]).map((r) => {
        const baseHue = hueFromId(r.id);
        return {
          id: r.id,
          name: r.name,
          emoji: r.icon?.trim() || FALLBACK_EMOJI,
          to: NAME_TO_ROUTE[r.name] ?? "/sections",
          ringFrom: `${baseHue} 80% 58%`,
          ringTo: `${(baseHue + 45) % 360} 78% 60%`,
        };
      });
    },
    staleTime: 60 * 60 * 1000, // Phase 39 — Departments: 1h fresh.
    gcTime: 24 * 60 * 60 * 1000,
  });
