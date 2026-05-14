/**
 * Phase 9 Part 4 — Multi-vendor fulfillment routing.
 * Read + status mutation hooks for `salsabil_fulfillment_nodes`.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";

export type FulfillmentStatus = "pending" | "preparing" | "prepared" | "shipped" | "delivered" | "cancelled";

export function useUpdateFulfillmentStatus() {
  const qc = useQueryClient();
  return useMutation<string, Error, { node_id: string; status: FulfillmentStatus }>({
    mutationFn: async ({ node_id, status }) => {
      const { data, error } = await HakimGateway.updateFulfillmentNodeStatus(node_id, status);
      if (error) throw new Error(error.message);
      return String(data.id);
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      qc.invalidateQueries({ queryKey: ["admin-grid", "salsabil_fulfillment_nodes"] });
      qc.invalidateQueries({ queryKey: ["vendor-fulfillment-nodes"] });
    },
    onError: (err) => toast.error(`تعذّر تحديث الحالة: ${err.message}`),
  });
}
