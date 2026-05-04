import { useEffect, useMemo, useState } from "react";
import { products as allProducts, useProductsVersion, type Product } from "@/lib/products";
import { useProductsQuery } from "@/hooks/useProductsQuery";
import { villageMetaFor } from "@/lib/villageMeta";
import {
  ROUTINE_KEY,
  type RoutineRecord,
  type RoutineFrequency,
  type VillageTagFilter,
} from "../types";

const loadRoutines = (): RoutineRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROUTINE_KEY);
    return raw ? (JSON.parse(raw) as RoutineRecord[]) : [];
  } catch {
    return [];
  }
};

const persistRoutines = (r: RoutineRecord[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(r));
  } catch {
    /* ignore quota / privacy errors */
  }
};

export interface UseVillageLogicResult {
  query: string;
  setQuery: (v: string) => void;
  tag: VillageTagFilter;
  setTag: (v: VillageTagFilter) => void;
  subCat: string;
  setSubCat: (v: string) => void;
  items: Product[];
  routines: RoutineRecord[];
  isRoutineActive: (productId: string) => boolean;
  toggleRoutine: (productId: string, discountPct: number, frequency: RoutineFrequency) => void;
}

export function useVillageLogic(): UseVillageLogicResult {
  // Subscribe to the TanStack Query catalog so loader-warmed data triggers
  // a render and SWR / background refetch is owned by React Query.
  const { data: queryProducts } = useProductsQuery();
  // Realtime channel mutates the in-memory `products` array; the version
  // bump keeps us in sync with live updates between query refetches.
  const productsVersion = useProductsVersion();

  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<VillageTagFilter>("all");
  const [subCat, setSubCat] = useState<string>("all");
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);

  useEffect(() => {
    setRoutines(loadRoutines());
  }, []);

  const villageProducts = useMemo<Product[]>(
    () => (queryProducts ?? allProducts).filter((p) => p.source === "village"),
    // queryProducts updates flow through; productsVersion captures realtime
    // mutations to the shared in-memory array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryProducts, productsVersion],
  );

  const items = useMemo(() => {
    const q = query.trim();
    return villageProducts.filter((p) => {
      if (subCat !== "all" && p.subCategory !== subCat) return false;
      if (q && !p.name.includes(q) && !(p.brand ?? "").includes(q)) return false;
      if (tag !== "all") {
        const meta = villageMetaFor(p.id);
        if (!meta || !meta.tags.includes(tag)) return false;
      }
      return true;
    });
  }, [villageProducts, query, tag, subCat]);

  const toggleRoutine = (
    productId: string,
    discountPct: number,
    frequency: RoutineFrequency,
  ) => {
    const cur = loadRoutines();
    const exists = cur.find((r) => r.productId === productId);
    const next: RoutineRecord[] = exists
      ? cur.filter((r) => r.productId !== productId)
      : [...cur, { productId, frequency, discountPct, createdAt: new Date().toISOString() }];
    persistRoutines(next);
    setRoutines(next);
  };

  const isRoutineActive = (productId: string) =>
    routines.some((r) => r.productId === productId);

  return {
    query,
    setQuery,
    tag,
    setTag,
    subCat,
    setSubCat,
    items,
    routines,
    isRoutineActive,
    toggleRoutine,
  };
}
