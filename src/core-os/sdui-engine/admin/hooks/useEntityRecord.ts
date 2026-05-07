/** useEntityRecord — fetch single row by primary key. */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEntityRecord(
  entityKey: string,
  tableName: string | undefined,
  primaryKeyCol: string | undefined,
  id: string | undefined,
) {
  return useQuery({
    queryKey: ["admin", "record", entityKey, id],
    enabled: !!tableName && !!id && !!primaryKeyCol,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as never)
        .select("*")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq(primaryKeyCol as any, id as any)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Record<string, unknown> | null;
    },
  });
}
