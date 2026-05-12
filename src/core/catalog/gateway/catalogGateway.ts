/**
 * Catalog Gateway — Facade وحيد للواجهة مع ProductCardVM/ProductDetailsVM.
 *
 * هذه الطبقة هي البوابة الوحيدة المسموح للـ UI استدعاؤها. تخفي:
 *  - تفاصيل supabase
 *  - منطق sections/capabilities
 *  - تجميع التوصيات والعروض والمنتجات الرائجة
 *
 * أي شيء في src/pages, src/components, src/apps يجب أن يستورد من هنا فقط.
 */
import { CatalogService, type PriceQuoteLineInput } from "../service/CatalogService";
import type { PriceQuoteVM } from "../service/catalog.functions";
import { getSectionIdentityFn, listSectionsFn } from "@/core/sections/sections.functions";
import type {
  ProductCardVM,
  ProductDetailsVM,
  ProductListVM,
  ProductRelationVM,
} from "../types";
import type { SectionIdentity } from "@/core/sections/types";

export interface ListSectionParams {
  slug: string;
  limit?: number;
  offset?: number;
  sort?: "popularity" | "new" | "price_asc" | "price_desc" | "seasonal";
}

export const catalogGateway = {
  // ─── Sections ───
  listSections(): Promise<SectionIdentity[]> {
    return listSectionsFn();
  },
  getSection(slug: string): Promise<SectionIdentity | null> {
    return getSectionIdentityFn({ data: { slug } });
  },

  // ─── Listing ───
  listSection(params: ListSectionParams): Promise<ProductListVM> {
    return CatalogService.listBySection({
      sectionSlug: params.slug,
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
    });
  },

  // ─── Details ───
  getDetails(slug: string): Promise<ProductDetailsVM | null> {
    return CatalogService.getDetails(slug);
  },

  // ─── Wave P-B (Static Catalog Killer) ─────────────────────────────────────
  // The canonical surface that replaces `getById` / `bySource` / static reads
  // from `@/lib/products`. Cart hydration and price-integrity flows go here.
  // ─────────────────────────────────────────────────────────────────────────
  getManyById(ids: readonly string[]): Promise<ProductCardVM[]> {
    return CatalogService.getManyById(ids);
  },
  getDetailsById(id: string): Promise<ProductDetailsVM | null> {
    return CatalogService.getDetailsById(id);
  },
  priceQuote(lines: readonly PriceQuoteLineInput[]): Promise<PriceQuoteVM> {
    return CatalogService.priceQuote(lines);
  },

  // ─── Recommendations ───
  getRelations(productId: string, limit = 12): Promise<ProductRelationVM[]> {
    return CatalogService.getRelations(productId, undefined, limit);
  },

  // ─── Curated rails (driven by sort strategies, never hardcoded slugs) ───
  trending(slug: string, limit = 12): Promise<ProductCardVM[]> {
    return CatalogService.listBySection({ sectionSlug: slug, sort: "popularity", limit }).then(
      (r) => r.items,
    );
  },
  newArrivals(slug: string, limit = 12): Promise<ProductCardVM[]> {
    return CatalogService.listBySection({ sectionSlug: slug, sort: "new", limit }).then(
      (r) => r.items,
    );
  },
  offers(slug: string, limit = 12): Promise<ProductCardVM[]> {
    return CatalogService.listBySection({ sectionSlug: slug, sort: "price_desc", limit }).then(
      (r) => r.items.filter((p) => p.price.compareAt && p.price.compareAt > p.price.amount),
    );
  },
};

export type CatalogGateway = typeof catalogGateway;
