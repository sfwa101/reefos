/**
 * useUpdateUSA — Phase 7 Part 5.
 * Calls `update_universal_asset(p_asset_id, p_name, p_description, p_base_price)` RPC
 * to atomically update a Universal Salsabil Asset, its active financial contract,
 * and the legacy `products` shim row.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("update_universal_asset", {
        p_asset_id: asset_id,
        p_name: name,
        p_description: description,
        p_base_price: base_price,
      });
      if (error) throw new Error(error.message ?? "update_failed");
      return String(data);
    },
    onSuccess: () => {
      toast.success("تم تحديث الأصل وتزامنه بنجاح");
      qc.invalidateQueries({ queryKey: ["salsabil_assets"] });
      qc.invalidateQueries({ queryKey: ["catalog", "products"] });
      qc.invalidateQueries({ queryKey: ["admin-grid"] });
      qc.invalidateQueries({ queryKey: ["admin", "list", "products"] });
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
