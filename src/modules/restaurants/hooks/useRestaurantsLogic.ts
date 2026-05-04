import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { RestoProduct } from "../types";

export type GroupedRestaurants = ReadonlyArray<readonly [string, RestoProduct[]]>;

/**
 * useRestaurantsLogic — fetches restaurant products from Supabase,
 * groups them by brand, and exposes search + active-brand state.
 *
 * NOTE on pricing: this view does NOT compute any inline pricing.
 * Per-line totals are read straight off `p.price`. When the meat/sweets
 * pattern of `pricingEngine.calculate` is applied to restaurant lines,
 * the integration point will be inside `MealRow` (a future
 * `useRestaurantLinePrice` hook) — not here.
 */
export function useRestaurantsLogic() {
  const [items, setItems] = useState<RestoProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,brand,price,image,rating,source,fulfillment_type,description,metadata",
        )
        .or("source.eq.restaurants,fulfillment_type.eq.restaurant")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) toast.error("تعذّر تحميل المطاعم");
      setItems((data ?? []) as RestoProduct[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    loading,
    query,
    setQuery,
    activeBrand,
    grouped,
    allBrands,
    handleJump,
  } as const;
}
