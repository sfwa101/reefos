/**
 * useHakimExecutor — Phase 16.
 * Loops over blueprint.suggested_assets and mints each via mint_universal_asset RPC.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mintUniversalAssetFn } from "@/lib/admin-catalog.functions";
import { tenantQueryKey } from "@/lib/tenantScope";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdui_layout: any;
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase.rpc as any)("mint_universal_asset", { payload });
          if (error) throw new Error(error.message ?? "mint_failed");
          report.minted.push(String(data));
        } catch (e) {
          report.failed.push({ name: asset.name, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return report;
    },
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: tenantQueryKey("salsabil_assets") });
      qc.invalidateQueries({ queryKey: tenantQueryKey("catalog") });
      qc.invalidateQueries({ queryKey: tenantQueryKey("admin", "list", "products") });
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
