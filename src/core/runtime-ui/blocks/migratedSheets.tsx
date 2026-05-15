/**
 * Migrated vertical sheets — Wave P-C · Phase C-5.
 *
 * Wraps relocated sheets that still live inside the kernel (no app imports).
 * App-bound sheets (butcher / sweets / compare-grid) are now registered by
 * `src/apps/reef-al-madina/runtime-blocks/register.ts` per Constitution v5.1
 * Article 2 (Kernel Purity).
 */
import type { BlockComponent } from "@/core/runtime-ui/RuntimeRenderer";
import BasketCard from "@/core/runtime-ui/blocks/product/basket-card";
import BasketSheet from "@/core/runtime-ui/blocks/commerce/basket-detail-sheet";
import SmartSwapSheet from "@/core/runtime-ui/blocks/commerce/smart-swap-sheet";
import CartUpgradeBanner from "@/core/runtime-ui/blocks/commerce/cart-upgrade-banner";
import { FulfillmentSelector } from "@/core/runtime-ui/blocks/commerce/fulfillment-selector";
import MealSheet from "@/core/runtime-ui/blocks/product/meal-sheet";
import RestaurantCard from "@/core/runtime-ui/blocks/product/restaurant-card";
import RestaurantItemSheet from "@/core/runtime-ui/blocks/product/restaurant-item-sheet";
import CompareSection from "@/core/runtime-ui/blocks/product/compare-section";
import BasketBuilder from "@/core/runtime-ui/blocks/commerce/basket-builder";
import SubscriptionManager from "@/core/runtime-ui/blocks/commerce/subscription-manager";

const propsOf = <T,>(block: { props?: unknown }): T =>
  (block.props ?? {}) as T;

export const BasketCardBlock: BlockComponent = ({ block }) => (
  <BasketCard {...propsOf<React.ComponentProps<typeof BasketCard>>(block)} />
);

export const BasketDetailSheetBlock: BlockComponent = ({ block }) => (
  <BasketSheet {...propsOf<React.ComponentProps<typeof BasketSheet>>(block)} />
);

export const SmartSwapSheetBlock: BlockComponent = ({ block }) => (
  <SmartSwapSheet {...propsOf<React.ComponentProps<typeof SmartSwapSheet>>(block)} />
);

export const CartUpgradeBannerBlock: BlockComponent = ({ block: _block }) => (
  <CartUpgradeBanner />
);

export const FulfillmentSelectorBlock: BlockComponent = ({ block }) => (
  <FulfillmentSelector
    {...propsOf<React.ComponentProps<typeof FulfillmentSelector>>(block)}
  />
);

export const MealSheetBlock: BlockComponent = ({ block }) => (
  <MealSheet {...propsOf<React.ComponentProps<typeof MealSheet>>(block)} />
);

export const RestaurantCardBlock: BlockComponent = ({ block }) => (
  <RestaurantCard
    {...propsOf<React.ComponentProps<typeof RestaurantCard>>(block)}
  />
);

export const RestaurantItemSheetBlock: BlockComponent = ({ block }) => (
  <RestaurantItemSheet
    {...propsOf<React.ComponentProps<typeof RestaurantItemSheet>>(block)}
  />
);

export const CompareSectionBlock: BlockComponent = ({ block: _block }) => (
  <CompareSection />
);

export const BasketBuilderBlock: BlockComponent = ({ block: _block }) => (
  <BasketBuilder />
);

export const SubscriptionManagerBlock: BlockComponent = ({ block: _block }) => (
  <SubscriptionManager />
);
