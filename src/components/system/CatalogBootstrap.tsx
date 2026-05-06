import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bindCatalogSource } from "@/lib/products";
import { productsQueryOptions } from "@/hooks/useProductsQuery";

/**
 * Phase 26.2 — Wires the per-request QueryClient into the legacy
 * `src/lib/products.ts` proxy so synchronous consumers (`getById`,
 * `bySource`, `products[]`) read live from the Query cache.
 *
 * Also kicks off the single full-catalog fetch that those legacy
 * consumers implicitly depend on. Idempotent — `ensureQueryData`
 * de-dupes if `useProductsQuery` already triggered the fetch.
 */
export function CatalogBootstrap() {
  const qc = useQueryClient();
  useEffect(() => {
    bindCatalogSource(qc);
    void qc.ensureQueryData(productsQueryOptions());
  }, [qc]);
  return null;
}
