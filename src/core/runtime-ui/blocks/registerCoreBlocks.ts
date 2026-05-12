/**
 * Block Registry — تسجيل البلوكات الأساسية مرة واحدة عند تحميل الموديول.
 * الإضافة لاحقاً = استدعاء blockRegistry.register بدون لمس RuntimeRenderer.
 */
import { blockRegistry } from "@/core/runtime-ui/RuntimeRenderer";
import {
  AddToCartBlock,
  ProductAddonsBlock,
  ProductDescriptionBlock,
  ProductDietFlagsBlock,
  ProductGalleryBlock,
  ProductGridBlock,
  ProductHeadingBlock,
  ProductListBlock,
  ProductNutritionBlock,
  ProductPriceBlock,
  ProductRelationsBlock,
  ProductVariantsBlock,
  QuickBuyBarBlock,
  SectionHeaderBlock,
  SubscribeCtaBlock,
} from "./blocks";
import {
  BackHeaderBlock,
  CompareBarBlock,
  ProductDetailSheetBlock,
  SectionFiltersSheetBlock,
  SectionHeroBannerBlock,
  SectionLayoutFactoryBlock,
} from "./sectionPage";

let registered = false;
export function registerCoreBlocks() {
  if (registered) return;
  blockRegistry.registerMany({
    "section.header": SectionHeaderBlock,
    "product.grid": ProductGridBlock,
    "product.list": ProductListBlock,
    "product.gallery": ProductGalleryBlock,
    "product.heading": ProductHeadingBlock,
    "product.price": ProductPriceBlock,
    "product.variants": ProductVariantsBlock,
    "product.addons": ProductAddonsBlock,
    "product.description": ProductDescriptionBlock,
    "product.nutrition": ProductNutritionBlock,
    "product.diet_flags": ProductDietFlagsBlock,
    "product.relations": ProductRelationsBlock,
    "commerce.add_to_cart": AddToCartBlock,
    "commerce.quick_buy_bar": QuickBuyBarBlock,
    "commerce.subscribe_cta": SubscribeCtaBlock,
    "nav.back_header": BackHeaderBlock,
    "section.hero_banner": SectionHeroBannerBlock,
    "section.layout_factory": SectionLayoutFactoryBlock,
    "section.filters_sheet": SectionFiltersSheetBlock,
    "commerce.compare_bar": CompareBarBlock,
    "product.detail_sheet": ProductDetailSheetBlock,
  });
  registered = true;
}
