/**
 * Catalog public API — هذا الملف فقط يجب استيراده من خارج src/core/catalog.
 */
export type {
  ProductCardVM,
  ProductDetailsVM,
  ProductListVM,
  ProductVariantVM,
  ProductAddonVM,
  ProductNutritionVM,
  ProductRelationVM,
  MediaRefVM,
  PriceVM,
  BadgeVM,
  I18nText,
  CurrencyCode,
  LocaleCode,
} from "./types";

export { CatalogService } from "./service/CatalogService";
export { sectionAdapters, type SectionAdapter } from "./adapters/SectionAdapters";
export { resolveRelations, type RelationType } from "./resolvers/RecommendationResolver";
