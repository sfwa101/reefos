/**
 * Reef Al Madina scope adapter for the Universal Omni-Search.
 * Phase 15.2 — reads directly from the Sovereign Catalog (salsabil_assets).
 */
import { searchSovereignAssets } from "@/core/commerce/knowledge/sovereignCatalog";
import { toLegacyAssetId } from "@/core/commerce/knowledge/sovereignCatalog";
import type { OmniScope, OmniHit } from "../SearchAtom";

export const reefScope: OmniScope = {
  appId: "reef",
  label: "ريف",
  async fetch(query, signal): Promise<OmniHit[]> {
    if (signal.aborted) return [];
    try {
      const rows = await searchSovereignAssets({ q: query, limit: 8 });
      if (signal.aborted) return [];
      return rows.map((p) => ({
        id: toLegacyAssetId(p.id),
        title: p.name,
        subtitle: p.category_path?.split("/")[0] ?? undefined,
        to: `/product/${toLegacyAssetId(p.id)}`,
        appId: "reef",
      }));
    } catch {
      return [];
    }
  },
};
