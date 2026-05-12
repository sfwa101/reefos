/**
 * CatalogService — Facade وحيد للواجهات.
 *
 * الواجهات تستدعي هذه الخدمة فقط (عبر hooks في Wave 2.C). هي بدورها تستدعي
 * createServerFn handlers ولا تتعامل مع supabase client مباشرة من المتصفح.
 */
import {
  listProductsBySectionFn,
  getProductDetailsFn,
  getProductRelationsFn,
  getProductsByIdsFn,
  getProductDetailsByIdFn,
  priceQuoteFn,
  type PriceQuoteVM,
} from "./catalog.functions";
import type {
  ProductCardVM,
  ProductDetailsVM,
  ProductListVM,
  ProductRelationVM,
} from "../types";
import { resolveRelations, type RelationType } from "../resolvers/RecommendationResolver";

export interface ListBySectionParams {
  sectionSlug: string;
  limit?: number;
  offset?: number;
  sort?: string; // popularity | new | price_asc | price_desc | seasonal
}

export interface PriceQuoteLineInput {
  productId: string;
  variantId?: string;
  qty: number;
}

export const CatalogService = {
  async listBySection(params: ListBySectionParams): Promise<ProductListVM> {
    return listProductsBySectionFn({ data: params });
  },

  async getDetails(slug: string): Promise<ProductDetailsVM | null> {
    return getProductDetailsFn({ data: { slug } });
  },

  async getRelations(
    productId: string,
    types?: readonly RelationType[],
    limit = 12,
  ): Promise<ProductRelationVM[]> {
    const stored = await getProductRelationsFn({ data: { productId } });
    return resolveRelations({ productId, stored, types, limit });
  },

  async getManyById(ids: readonly string[]): Promise<ProductCardVM[]> {
    if (ids.length === 0) return [];
    return getProductsByIdsFn({ data: { ids: [...ids] } });
  },

  async getDetailsById(id: string): Promise<ProductDetailsVM | null> {
    return getProductDetailsByIdFn({ data: { id } });
  },

  async priceQuote(lines: readonly PriceQuoteLineInput[]): Promise<PriceQuoteVM> {
    if (lines.length === 0) {
      return { lines: [], currency: "EGP", quotedAt: new Date().toISOString() };
    }
    return priceQuoteFn({ data: { lines: [...lines] } });
  },
};
