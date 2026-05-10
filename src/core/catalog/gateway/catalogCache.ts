/**
 * Cache helpers — invalidation + prefetch موحّدة.
 */
import type { QueryClient } from "@tanstack/react-query";
import { catalogKeys, sectionListQuery, productDetailsQuery } from "./catalogQueries";

export const catalogCache = {
  invalidateAll(qc: QueryClient) {
    return qc.invalidateQueries({ queryKey: catalogKeys.all });
  },
  invalidateSection(qc: QueryClient, slug: string) {
    return qc.invalidateQueries({ queryKey: catalogKeys.section(slug) });
  },
  invalidateProduct(qc: QueryClient, slug: string) {
    return qc.invalidateQueries({ queryKey: catalogKeys.details(slug) });
  },
  prefetchSection(qc: QueryClient, slug: string) {
    return qc.prefetchQuery(sectionListQuery({ slug }));
  },
  prefetchProduct(qc: QueryClient, slug: string) {
    return qc.prefetchQuery(productDetailsQuery(slug));
  },
};
