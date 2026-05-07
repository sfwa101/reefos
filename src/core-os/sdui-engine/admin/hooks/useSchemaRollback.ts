/** useSchemaRollback — invokes admin_schema_rollback RPC. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSchemaRollback(entityId: string | undefined, mode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!entityId) throw new Error("entity_id_required");
      const { data, error } = await supabase.rpc("admin_schema_rollback", {
        p_entity_id: entityId,
        p_mode: mode,
      });
      if (error) throw error;
      return data as { rolled_back_to: string; version: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "definition"] });
      toast.success("تم الرجوع إلى الإصدار السابق");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "تعذّر التراجع");
    },
  });
}
