/**
 * useEntityList — server-paginated infinite scroll for any registered
 * entity. Routed through RuntimeUIGateway.
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";

export const ENTITY_PAGE_SIZE = 50;

export interface EntityListFilters {
  search?: string;
  /** Column → value equality filters. */
  eq?: Record<string, string | number | boolean>;
  orderBy?: { column: string; ascending?: boolean };
}

export function useEntityList(
  entityKey: string,
  tableName: string | undefined,
  filters: EntityListFilters = {},
) {
  return useInfiniteQuery({
    queryKey: ["admin", "list", entityKey, filters],
    enabled: !!tableName,
    initialPageParam: 0,
    staleTime: 15_000,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * ENTITY_PAGE_SIZE;
      const to = from + ENTITY_PAGE_SIZE - 1;
      // P0: only request `exact` count on the first page; subsequent infinite
      // scroll pages skip the count entirely (massive p99 win on huge tables).
      const { data, count, error } = await RuntimeUIGateway.listEntityRows(
        tableName as string,
        {
          from,
          to,
          withCount: pageParam === 0,
          eq: filters.eq,
          orderBy: filters.orderBy,
        },
      );
      if (error) throw error;
      return {
        rows: data,
        nextPage: data.length < ENTITY_PAGE_SIZE ? null : pageParam + 1,
        total: count ?? 0,
      };
    },
    getNextPageParam: (last) => last.nextPage,
  });
}
