/**
 * useEntityList — server-paginated infinite scroll for any registered
 * entity. Uses Supabase `.range()` exclusively. Zero client-side filtering.
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from(tableName as never)
        .select("*", { count: "exact" })
        .range(from, to);

      if (filters.eq) {
        for (const [k, v] of Object.entries(filters.eq)) q = q.eq(k, v);
      }
      if (filters.orderBy) {
        q = q.order(filters.orderBy.column, { ascending: filters.orderBy.ascending ?? true });
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return {
        rows: (data ?? []) as Record<string, unknown>[],
        nextPage: (data?.length ?? 0) < ENTITY_PAGE_SIZE ? null : pageParam + 1,
        total: count ?? 0,
      };
    },
    getNextPageParam: (last) => last.nextPage,
  });
}
