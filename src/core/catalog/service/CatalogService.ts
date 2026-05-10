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
} from "./catalog.functions";
import type {
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
};
