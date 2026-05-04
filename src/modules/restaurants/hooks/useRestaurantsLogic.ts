import { useCallback, useMemo, useState } from "react";
import { useRestaurantsQuery } from "@/core/data/restaurantQueries";
import type { RestoProduct } from "../types";

export type GroupedRestaurants = ReadonlyArray<readonly [string, RestoProduct[]]>;

/**
 * useRestaurantsLogic — orchestrates the restaurants page.
 *
 * Data layer: delegated entirely to `useRestaurantsQuery` (TanStack Query).
 * No more direct Supabase calls / `useEffect` fetch dance / manual
 * loading state — the hook owns caching, dedup, and background refetch.
 *
 * Local responsibilities (kept here):
 *   • search query state,
 *   • active brand for the sticky tabs,
 *   • brand grouping + search filtering (memoised),
 *   • imperative scroll-into-view jump.
 *
 * NOTE on pricing: still no inline pricing in this view. Per-line totals
 * read from `p.price`. Future `pricingEngine.calculate` integration lands
 * inside `MealRow`, not here.
 */
export function useRestaurantsLogic() {
  const { data, isLoading, isError, error } = useRestaurantsQuery();

  // Stable empty array — avoids re-creating identity on every render and
  // keeps downstream `useMemo` deps stable when the query is still loading.
  const items = useMemo<ReadonlyArray<RestoProduct>>(() => data ?? [], [data]);

  const [query, setQuery] = useState<string>("");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const grouped = useMemo<GroupedRestaurants>(() => {
    const q = query.trim();
    const filtered = q
      ? items.filter(
          (p) => p.name.includes(q) || (p.brand ?? "").includes(q),
        )
      : items;
    const map = new Map<string, RestoProduct[]>();
    for (const p of filtered) {
      const key = p.brand ?? "أخرى";
      const bucket = map.get(key);
      if (bucket) bucket.push(p);
      else map.set(key, [p]);
    }
    return Array.from(map.entries());
  }, [items, query]);

  const allBrands = useMemo<ReadonlyArray<string>>(
    () => Array.from(new Set(items.map((p) => p.brand ?? "أخرى"))),
    [items],
  );

  const handleJump = useCallback((brand: string): void => {
    setActiveBrand(brand);
    if (typeof document === "undefined") return;
    const el = document.getElementById(
      "rest-" + brand.replace(/\s+/g, "-").toLowerCase().slice(0, 40),
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return {
    loading: isLoading,
    isError,
    error,
    query,
    setQuery,
    activeBrand,
    grouped,
    allBrands,
    handleJump,
  } as const;
}
