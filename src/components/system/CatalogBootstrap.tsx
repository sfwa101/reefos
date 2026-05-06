import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bindCatalogSource } from "@/lib/products";

/**
 * Phase 26.2 — Wires the per-request QueryClient into the legacy
 * `src/lib/products.ts` proxy so synchronous consumers (`getById`,
 * `bySource`, `products[]`) read live from the Query cache.
 *
 * Phase T patch — the eager 2,000-row catalog fetch was removed from
 * cold start. The full catalog now loads lazily, only when a real
 * consumer (`useProductsQuery`) mounts. Home uses `useHomeProductsQuery`
 * which fetches a 48-row slice instead.
 */
export function CatalogBootstrap() {
  const qc = useQueryClient();
  useEffect(() => {
    bindCatalogSource(qc);
  }, [qc]);
  return null;
}
