/**
 * useHakimExecutor — Phase 16.
 * Loops over blueprint.suggested_assets and mints each via mint_universal_asset RPC.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mintUniversalAssetFn } from "@/core/catalog/admin-catalog.functions";
import { workspaceQueryKey, getWorkspaceIdSync } from "@/core/identity/workspace";

export interface SuggestedAsset {
  name: string;
  asset_type: "physical" | "service" | "digital" | "rental" | "milestone_project";
  pricing_model:
    | "flat"
    | "tiered_wholesale"
    | "subscription"
    | "deposit_and_rental"
    | "milestone_installments";
  base_price: number;
  traits: Record<string, unknown>;
}

export interface HakimBlueprint {
  module_name: string;
  description: string;
  suggested_assets: SuggestedAsset[];
  sdui_layout: Record<string, unknown> | null;
}

export interface ExecutionReport {
  total: number;
  minted: string[];
  failed: { name: string; error: string }[];
}

function toMintPayload(a: SuggestedAsset, moduleName: string) {
  const traitsList = Object.entries(a.traits ?? {}).map(
    ([k, v]) => `${k}:${String(v)}`,
  );
  return {
    asset: {
      name: a.name,
      description: `${moduleName} — ${a.name}`,
      asset_type: a.asset_type,
      traits: traitsList,
      media: [],
    },
    skus: [
      {
        sku_code: `HAKIM-${a.name.replace(/\s+/g, "-").slice(0, 20)}-${Date.now().toString(36)}`,
        attributes: a.traits ?? {},
      },
    ],
    financial_contract: {
      pricing_model: a.pricing_model,
      base_price: Number(a.base_price) || 0,
      currency: "EGP",
      contract_rules: {},
    },
  };
}

export function useHakimExecutor() {
  const qc = useQueryClient();
  return useMutation<ExecutionReport, Error, HakimBlueprint>({
    mutationFn: async (blueprint) => {
      const report: ExecutionReport = { total: blueprint.suggested_assets.length, minted: [], failed: [] };
      for (const asset of blueprint.suggested_assets) {
        try {
          const payload = toMintPayload(asset, blueprint.module_name);
          const { id } = await mintUniversalAssetFn({ data: { payload } });
          report.minted.push(id);
        } catch (e) {
          report.failed.push({ name: asset.name, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return report;
    },
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: workspaceQueryKey("salsabil_assets") });
      qc.invalidateQueries({ queryKey: workspaceQueryKey("catalog") });
      qc.invalidateQueries({ queryKey: workspaceQueryKey("admin", "list", "products") });
      if (report.failed.length === 0) {
        toast.success(`تم سكّ ${report.minted.length} أصل بنجاح ✨`);
      } else {
        toast.warning(
          `تمّ سكّ ${report.minted.length}/${report.total}، فشل ${report.failed.length}`,
        );
      }
    },
    onError: (err) => toast.error(`فشل التنفيذ: ${err.message}`),
  });
}
