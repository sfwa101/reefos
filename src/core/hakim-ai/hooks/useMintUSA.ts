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
      // Fold sovereign rich-DNA fields into `traits` jsonb (Article V-1.C):
      // traits column on `salsabil_assets` is jsonb — store both semantic
      // tags AND structured extras so admin search/RLS can read them.
      const a = payload.asset;
      const richTraits: Record<string, unknown> = {
        tags: Array.isArray(a.traits) ? a.traits : [],
        category_path: a.category_path ?? null,
        brand: a.brand ?? null,
        origin_country: a.origin_country ?? null,
        barcode: (a as { barcode?: string | null }).barcode ?? null,
        halal: (a as { halal?: boolean | null }).halal ?? null,
        nutrition: a.nutrition ?? null,
        net_weight: a.physical?.net_weight ?? null,
        weight_unit: a.physical?.weight_unit ?? null,
        allergens: a.allergens ?? null,
        marketing: a.marketing ?? null,
        tier_rules: (a as { tier_rules?: Record<string, unknown> | null }).tier_rules ?? null,
        variant_axes: (payload.skus ?? []).map((s) => s.variant_axes ?? null),
      };
      const enrichedPayload = {
        ...payload,
        asset: { ...a, traits: richTraits as unknown as string[] },
      };
      const { data, error } = await HakimGateway.mintUniversalAsset(enrichedPayload);
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
