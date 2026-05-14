/**
 * Salsabil OS — Phase 1 · Wave 3
 * Layer 3 (Gateway) · CatalogGateway — CommerceEntity façade.
 *
 * The single audited bridge that returns strictly-typed
 * `CommerceEntity` (Product DNA) graphs to consumers that operate at
 * the domain level (POS, KDS, Cashier Brain).
 *
 * Internally delegates to the legacy `catalogGateway` (ProductCardVM)
 * and projects the result into `CommerceEntity` via the deterministic
 * `commerceEntityFromCard` adapter — no Supabase access here.
 */
import { catalogGateway } from "@/core/catalog/gateway/catalogGateway";
import {
  commerceEntityFromCard,
  type CommerceEntity,
} from "@/core/commerce/entity/CommerceEntity";

export interface ListSectionEntitiesParams {
  readonly sectionSlug: string;
  readonly limit?: number;
  readonly offset?: number;
}

export const CatalogGateway = {
  async listSectionEntities(
    params: ListSectionEntitiesParams,
  ): Promise<CommerceEntity[]> {
    const list = await catalogGateway.listSection({
      slug: params.sectionSlug,
      limit: params.limit,
      offset: params.offset,
    });
    return list.items.map(commerceEntityFromCard);
  },

  async getEntitiesByIds(ids: readonly string[]): Promise<CommerceEntity[]> {
    if (ids.length === 0) return [];
    const cards = await catalogGateway.getManyById(ids);
    return cards.map(commerceEntityFromCard);
  },
};

export type CatalogGatewayType = typeof CatalogGateway;
