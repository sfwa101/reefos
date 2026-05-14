/** useEntityRecord — fetch single row by primary key. */
import { useQuery } from "@tanstack/react-query";
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";

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
      const { data, error } = await RuntimeUIGateway.getEntityRecord(
        tableName as string,
        primaryKeyCol as string,
        id as string,
      );
      if (error) throw error;
      return data;
    },
  });
}
