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
import {
  BasketCardBlock,
  BasketDetailSheetBlock,
  SmartSwapSheetBlock,
  CartUpgradeBannerBlock,
  FulfillmentSelectorBlock,
  MealSheetBlock,
  ButcherSheetBlock,
  RestaurantCardBlock,
  RestaurantItemSheetBlock,
  SweetsSheetBlock,
  CompareSectionBlock,
  BasketBuilderBlock,
  SubscriptionManagerBlock,
  CompareGridBlock,
} from "./migratedSheets";

let registered = false;
export function registerCoreBlocks() {
  if (registered) return;
  blockRegistry.registerMany({
    "product.basket_card": BasketCardBlock,
    "commerce.basket_detail_sheet": BasketDetailSheetBlock,
    "commerce.smart_swap_sheet": SmartSwapSheetBlock,
    "commerce.cart_upgrade_banner": CartUpgradeBannerBlock,
    "commerce.fulfillment_selector": FulfillmentSelectorBlock,
    "product.meal_sheet": MealSheetBlock,
    "product.butcher_sheet": ButcherSheetBlock,
    "product.restaurant_card": RestaurantCardBlock,
    "product.restaurant_item_sheet": RestaurantItemSheetBlock,
    "product.sweets_sheet": SweetsSheetBlock,
    "product.compare_section": CompareSectionBlock,
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
