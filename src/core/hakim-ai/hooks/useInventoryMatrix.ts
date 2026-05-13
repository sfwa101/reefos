/**
 * useInventoryMatrix — Phase 8 Part 2.
 * Decentralized multi-vendor / multi-location stock matrix per SKU.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase
        .from("salsabil_inventory_matrix")
        .select("*")
        .eq("sku_id", skuId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InventoryRow[];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("upsert_inventory_matrix", {
        p_sku_id: sku_id,
        p_location_id: location_id,
        p_inventory_type: inventory_type,
        p_availability: availability,
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
