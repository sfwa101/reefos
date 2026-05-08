/**
 * useMintUSA — Phase 7 Part 3.
 * Calls the `mint_universal_asset(payload jsonb)` RPC to atomically persist
 * a Universal Salsabil Asset (asset + SKUs + financial contract) and mirror
 * physical assets into the legacy `products` table for zero-downtime cutover.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { USAGenesisPayload } from "./useVisionGenesis";

export type MintUSAInput = Pick<
  USAGenesisPayload,
  "asset" | "skus" | "financial_contract"
> & {
  /** Optional 768-dim semantic embedding to persist (zero-waste reuse from Matchmaker). */
  semantic_embedding?: number[] | null;
};

export function useMintUSA() {
  const qc = useQueryClient();
  return useMutation<string, Error, MintUSAInput>({
    mutationFn: async (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("mint_universal_asset", {
        payload,
      });
      if (error) throw new Error(error.message ?? "mint_failed");
      return String(data);
    },
    onSuccess: (assetId) => {
      toast.success("تم سكّ الأصل بنجاح وتحديث المتجر");
      qc.invalidateQueries({ queryKey: ["salsabil_assets"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin", "list", "products"] });
      console.log("[Mint] USA minted:", assetId);
    },
    onError: (err) => {
      toast.error(err.message?.includes("unauthorized")
        ? "صلاحيات الإدارة مطلوبة لسكّ الأصل."
        : `تعذّر سكّ الأصل: ${err.message}`);
    },
  });
}
