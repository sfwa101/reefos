import { useEffect, useMemo, useState } from "react";
import { products as allProducts, useProductsVersion, type Product } from "@/lib/products";
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
  // Re-run memoized filter when product catalog version bumps.
  const productsVersion = useProductsVersion();

  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<VillageTagFilter>("all");
  const [subCat, setSubCat] = useState<string>("all");
  const [routines, setRoutines] = useState<RoutineRecord[]>([]);

  useEffect(() => {
    setRoutines(loadRoutines());
  }, []);

  const villageProducts = useMemo(
    () => allProducts.filter((p) => p.source === "village"),
    [productsVersion],
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
