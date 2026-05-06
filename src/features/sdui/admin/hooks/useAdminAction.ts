/**
 * useAdminAction — invokes a registered admin_action RPC. Args are
 * passed through; it is the caller's responsibility (the RPC itself)
 * to validate/authorize.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdminAction(rpcName: string, entityKey?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(rpcName, args);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (entityKey) {
        qc.invalidateQueries({ queryKey: ["admin", "list", entityKey] });
      }
      toast.success("تم تنفيذ الإجراء");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "فشل تنفيذ الإجراء");
    },
  });
}
