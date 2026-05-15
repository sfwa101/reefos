/**
 * Block Registry — تسجيل البلوكات الأساسية للنواة فقط.
 *
 * Constitution v5.1 / Article 2 (Kernel Purity): app-bound blocks
 * (butcher / sweets / compare-grid / section page wrappers) are NOT
 * registered here. Each vertical app registers its own blocks at boot
 * via its `runtime-blocks/register.ts` file. See
 * `src/apps/reef-al-madina/runtime-blocks/register.ts`.
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
  BasketCardBlock,
  BasketDetailSheetBlock,
  SmartSwapSheetBlock,
  CartUpgradeBannerBlock,
  FulfillmentSelectorBlock,
  MealSheetBlock,
  RestaurantCardBlock,
  RestaurantItemSheetBlock,
  CompareSectionBlock,
  BasketBuilderBlock,
  SubscriptionManagerBlock,
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
    "product.restaurant_card": RestaurantCardBlock,
    "product.restaurant_item_sheet": RestaurantItemSheetBlock,
    "product.compare_section": CompareSectionBlock,
    "commerce.basket_builder": BasketBuilderBlock,
    "commerce.subscription_manager": SubscriptionManagerBlock,
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
  });
  registered = true;
}
