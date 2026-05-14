/** @deprecated Replaced by Vision Cortex (`@/core/vision/gateway/hooks#useApproveInference`). */
/**
 * useMintUSA — Phase 7 Part 3.
 * Calls the `mint_universal_asset(payload jsonb)` RPC to atomically persist
 * a Universal Salsabil Asset (asset + SKUs + financial contract) and mirror
 * physical assets into the legacy `products` table for zero-downtime cutover.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";
import { workspaceQueryKey, getWorkspaceIdSync } from "@/core/identity/workspace";
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
      const { data, error } = await HakimGateway.mintUniversalAsset(payload);
      if (error) throw new Error(error.message ?? "mint_failed");
      return String(data);
    },
    onSuccess: () => {
      toast.success("تم سكّ الأصل بنجاح وتحديث المتجر");
      qc.invalidateQueries({ queryKey: workspaceQueryKey("salsabil_assets") });
      qc.invalidateQueries({ queryKey: workspaceQueryKey("catalog") });
      qc.invalidateQueries({ queryKey: workspaceQueryKey("admin", "list", "products") });
    },
    onError: (err) => {
      toast.error(err.message?.includes("unauthorized")
        ? "صلاحيات الإدارة مطلوبة لسكّ الأصل."
        : `تعذّر سكّ الأصل: ${err.message}`);
    },
  });
}
