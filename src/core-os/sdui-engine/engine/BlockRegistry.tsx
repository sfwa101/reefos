/**
 * BlockRegistry — single source of truth mapping `block.type` → renderer.
 * Adding a new block: extend the schema union + register here. Renderer
 * auto-skips unknown types via the exhaustiveness guard.
 */
import type { ReactElement } from "react";
import type { SduiBlock } from "./schemas";
import { SduiHeroBlock } from "../blocks/SduiHeroBlock";
import { SduiBentoBlock } from "../blocks/SduiBentoBlock";
import { SduiSmartRail } from "../blocks/SduiSmartRail";
import { SduiModifierBlock } from "../blocks/SduiModifierBlock";
import { SduiAppGridBlock } from "../blocks/SduiAppGridBlock";
import { SduiOmniSearchBlock } from "../blocks/SduiOmniSearchBlock";
import { SduiUnifiedStatusBlock } from "../blocks/SduiUnifiedStatusBlock";
import { SduiBarqTrackingBlock } from "../blocks/SduiBarqTrackingBlock";
import { SduiOfferFlashSale } from "../blocks/offers/SduiOfferFlashSale";
import { SduiOfferBundle } from "../blocks/offers/SduiOfferBundle";
import { SduiOfferGroupBuy } from "../blocks/offers/SduiOfferGroupBuy";

export function renderBlock(block: SduiBlock): ReactElement | null {
  switch (block.type) {
    case "hero":
      return <SduiHeroBlock block={block} />;
    case "bento_grid":
      return <SduiBentoBlock block={block} />;
    case "smart_rail":
      return <SduiSmartRail block={block} />;
    case "modifier_group":
      return <SduiModifierBlock block={block} />;
    case "app_grid":
      return <SduiAppGridBlock block={block} />;
    case "omni_search":
      return <SduiOmniSearchBlock block={block} />;
    case "unified_status":
      return <SduiUnifiedStatusBlock />;
    case "barq_tracking":
      return <SduiBarqTrackingBlock block={block} />;
    case "offer_flash_sale":
      return <SduiOfferFlashSale block={block} />;
    case "offer_bundle":
      return <SduiOfferBundle block={block} />;
    case "offer_group_buy":
      return <SduiOfferGroupBuy block={block} />;
    default: {
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}
