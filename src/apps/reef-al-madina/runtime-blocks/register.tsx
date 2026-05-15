/**
 * Reef Al-Madina runtime block registration.
 *
 * Constitution v5.1 / Article 2 (Kernel Purity): block components that
 * import from `@/apps/reef-al-madina/**` (storefront, weighed-prep,
 * custom-fulfillment, group-buy, offers) must NOT live in `src/core/**`.
 * They live here under the app and register themselves into the kernel's
 * registries at boot time.
 *
 * Call `registerReefBlocks()` once during boot of any surface that renders
 * descriptors (storefront routes, runtime/$slug, SectionPage, etc.).
 */
import type { BlockComponent } from "@/core/runtime-ui/RuntimeRenderer";
import { blockRegistry } from "@/core/runtime-ui/RuntimeRenderer";
import { sduiBlockRegistry } from "@/core/runtime-ui/sdui/engine/BlockRegistry";

import ButcherSheet from "./product/butcher-sheet";
import SweetsSheet from "./product/sweets-sheet";
import CompareGrid from "./commerce/compare-grid";
import {
  BackHeaderBlock,
  SectionHeroBannerBlock,
  SectionLayoutFactoryBlock,
  SectionFiltersSheetBlock,
  ProductDetailSheetBlock,
  CompareBarBlock,
} from "./sectionPage";

import { SduiOfferFlashSale } from "./sdui/SduiOfferFlashSale";
import { SduiOfferBundle } from "./sdui/SduiOfferBundle";
import { SduiOfferGroupBuy } from "./sdui/SduiOfferGroupBuy";
import { SduiOfferNeighborhoodPool } from "./sdui/SduiOfferNeighborhoodPool";

const propsOf = <T,>(block: { props?: unknown }): T =>
  (block.props ?? {}) as T;

const ButcherSheetBlock: BlockComponent = ({ block }) => (
  <ButcherSheet {...propsOf<React.ComponentProps<typeof ButcherSheet>>(block)} />
);
const SweetsSheetBlock: BlockComponent = ({ block }) => (
  <SweetsSheet {...propsOf<React.ComponentProps<typeof SweetsSheet>>(block)} />
);
const CompareGridBlock: BlockComponent = () => <CompareGrid />;

let registered = false;
export function registerReefBlocks(): void {
  if (registered) return;

  // RuntimeRenderer (descriptor) blocks
  blockRegistry.registerMany({
    "product.butcher_sheet": ButcherSheetBlock,
    "product.sweets_sheet": SweetsSheetBlock,
    "commerce.compare_grid": CompareGridBlock,
    "nav.back_header": BackHeaderBlock,
    "section.hero_banner": SectionHeroBannerBlock,
    "section.layout_factory": SectionLayoutFactoryBlock,
    "section.filters_sheet": SectionFiltersSheetBlock,
    "commerce.compare_bar": CompareBarBlock,
    "product.detail_sheet": ProductDetailSheetBlock,
  });

  // SDUI offer blocks
  sduiBlockRegistry.register("offer_flash_sale", (b) => (
    <SduiOfferFlashSale block={b} />
  ));
  sduiBlockRegistry.register("offer_bundle", (b) => <SduiOfferBundle block={b} />);
  sduiBlockRegistry.register("offer_group_buy", (b) => <SduiOfferGroupBuy block={b} />);
  sduiBlockRegistry.register("offer_neighborhood_pool", (b) => <SduiOfferNeighborhoodPool block={b} />);

  registered = true;
}

// Auto-register on module import — keeps boot wiring symmetrical with
// `registerCoreBlocks()` and means any caller importing this module gets
// the app blocks live without needing a second function call.
registerReefBlocks();
