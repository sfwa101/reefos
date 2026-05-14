/**
 * useUpdateUSA — Phase 7 Part 5.
 * Calls `update_universal_asset(p_asset_id, p_name, p_description, p_base_price)` RPC
 * to atomically update a Universal Salsabil Asset, its active financial contract,
 * and the legacy `products` shim row.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";
import { tenantQueryKey } from "@/lib/tenantScope";

export interface UpdateUSAInput {
  asset_id: string;
  name: string;
  description: string | null;
  base_price: number | null;
}

export function useUpdateUSA() {
  const qc = useQueryClient();
  return useMutation<string, Error, UpdateUSAInput>({
    mutationFn: async ({ asset_id, name, description, base_price }) => {
      const { data, error } = await HakimGateway.updateUniversalAsset({
        asset_id,
        name,
        description,
        base_price,
      });
      if (error) throw new Error(error.message ?? "update_failed");
      return String(data);
    },
    onSuccess: () => {
      toast.success("تم تحديث الأصل وتزامنه بنجاح");
      // Phase 43 — tenant-scoped invalidations (match fetch keys exactly).
      qc.invalidateQueries({ queryKey: tenantQueryKey("salsabil_assets") });
      qc.invalidateQueries({ queryKey: tenantQueryKey("catalog") });
      qc.invalidateQueries({ queryKey: tenantQueryKey("admin-grid") });
      qc.invalidateQueries({ queryKey: tenantQueryKey("admin", "list", "products") });
    },
    onError: (err) => {
      toast.error(
        err.message?.includes("unauthorized")
          ? "صلاحيات الإدارة مطلوبة لتحديث الأصل."
          : `تعذّر التحديث: ${err.message}`,
      );
    },
  });
}
