/**
 * useInventoryMatrix — Phase 8 Part 2.
 * Decentralized multi-vendor / multi-location stock matrix per SKU.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";

export interface InventoryRow {
  id: string;
  sku_id: string;
  location_code: string | null;
  inventory_type: string;
  availability_data: Record<string, unknown>;
  updated_at: string;
}

export function useInventoryMatrix(skuId: string | undefined) {
  return useQuery<InventoryRow[]>({
    queryKey: ["salsabil_inventory", skuId],
    enabled: !!skuId,
    queryFn: async () => {
      const { data, error } = await HakimGateway.listInventoryMatrix(skuId!);
      if (error) throw error;
      return data as InventoryRow[];
    },
  });
}

export interface UpsertInventoryInput {
  sku_id: string;
  location_id: string;
  inventory_type?: "count" | "time_slots" | "capacity";
  availability: Record<string, unknown>;
}

export function useUpdateInventory() {
  const qc = useQueryClient();
  return useMutation<string, Error, UpsertInventoryInput>({
    mutationFn: async ({ sku_id, location_id, inventory_type = "count", availability }: UpsertInventoryInput) => {
      const { data, error } = await HakimGateway.upsertInventoryMatrix({
        sku_id,
        location_id,
        inventory_type,
        availability,
      });
      if (error) throw new Error(error.message ?? "inventory_upsert_failed");
      return String(data);
    },
    onSuccess: (_id, vars) => {
      toast.success("تم تحديث المخزون");
      qc.invalidateQueries({ queryKey: ["salsabil_inventory", vars.sku_id] });
    },
    onError: (err) => {
      toast.error(
        err.message?.includes("unauthorized")
          ? "صلاحيات الإدارة مطلوبة لتحديث المخزون."
          : `تعذّر تحديث المخزون: ${err.message}`,
      );
    },
  });
}
