/**
 * useAdminAction — invokes a registered admin_action RPC. Args are
 * passed through; it is the caller's responsibility (the RPC itself)
 * to validate/authorize.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";
import { toast } from "sonner";

export function useAdminAction(rpcName: string, entityKey?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: Record<string, unknown>) => {
      const { data, error } = await RuntimeUIGateway.invokeAdminAction(rpcName, args);
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
