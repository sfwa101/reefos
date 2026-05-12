/**
 * Migrated vertical sheets — Wave P-C · Phase C-5.
 *
 * Thin block wrappers around the 11 ex-vertical UI sheets that were relocated
 * out of `src/components/{vertical}/` into `src/core/runtime-ui/blocks/{commerce,product}/`.
 * Each block kind is generic and slug-agnostic; the underlying component
 * decides its visual variant from props/identity, never from a hardcoded slug.
 */
import type { BlockComponent } from "@/core/runtime-ui/RuntimeRenderer";
import BasketCard from "@/core/runtime-ui/blocks/product/basket-card";
import BasketSheet from "@/core/runtime-ui/blocks/commerce/basket-detail-sheet";
import SmartSwapSheet from "@/core/runtime-ui/blocks/commerce/smart-swap-sheet";
import CartUpgradeBanner from "@/core/runtime-ui/blocks/commerce/cart-upgrade-banner";
import { FulfillmentSelector } from "@/core/runtime-ui/blocks/commerce/fulfillment-selector";
import MealSheet from "@/core/runtime-ui/blocks/product/meal-sheet";
import ButcherSheet from "@/core/runtime-ui/blocks/product/butcher-sheet";
import RestaurantCard from "@/core/runtime-ui/blocks/product/restaurant-card";
import RestaurantItemSheet from "@/core/runtime-ui/blocks/product/restaurant-item-sheet";
import SweetsSheet from "@/core/runtime-ui/blocks/product/sweets-sheet";
import CompareSection from "@/core/runtime-ui/blocks/product/compare-section";
import BasketBuilder from "@/core/runtime-ui/blocks/commerce/basket-builder";
import SubscriptionManager from "@/core/runtime-ui/blocks/commerce/subscription-manager";
import CompareGrid from "@/core/runtime-ui/blocks/commerce/compare-grid";

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

export const ButcherSheetBlock: BlockComponent = ({ block }) => (
  <ButcherSheet {...propsOf<React.ComponentProps<typeof ButcherSheet>>(block)} />
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

export const SweetsSheetBlock: BlockComponent = ({ block }) => (
  <SweetsSheet {...propsOf<React.ComponentProps<typeof SweetsSheet>>(block)} />
);

export const CompareSectionBlock: BlockComponent = ({ block: _block }) => (
  <CompareSection />
);
