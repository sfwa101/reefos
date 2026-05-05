/**
 * BlockRegistry — single source of truth mapping `block.type` → renderer.
 * Each entry is a render function that accepts the validated block and
 * returns JSX. Adding a new block: extend the schema union + register here.
 * Renderer auto-skips unknown types.
 *
 * Zero `any`: the discriminated union narrows `block` per renderer arm.
 */
import type { ReactElement } from "react";
import type { SduiBlock } from "./schemas";
import { SduiHeroBlock } from "../blocks/SduiHeroBlock";
import { SduiBentoBlock } from "../blocks/SduiBentoBlock";
import { SduiSmartRail } from "../blocks/SduiSmartRail";
import { SduiSectionHeader } from "../blocks/SduiSectionHeader";
import { SduiProductRail } from "../blocks/SduiProductRail";

export function renderBlock(block: SduiBlock): ReactElement | null {
  switch (block.type) {
    case "hero":
      return <SduiHeroBlock block={block} />;
    case "bento_grid":
      return <SduiBentoBlock block={block} />;
    case "smart_rail":
      return <SduiSmartRail block={block} />;
    case "section_header":
      return <SduiSectionHeader block={block} />;
    case "product_rail":
      return <SduiProductRail block={block} />;
    default: {
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}
