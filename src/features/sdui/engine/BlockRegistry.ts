/**
 * BlockRegistry — single source of truth mapping `block.type` → component.
 * Adding a new block type means: extend schema discriminated union +
 * register it here. Renderer auto-skips unknown types.
 */
import type { ComponentType } from "react";
import type { SduiBlock } from "./schemas";
import { SduiHeroBlock } from "../blocks/SduiHeroBlock";
import { SduiBentoBlock } from "../blocks/SduiBentoBlock";
import { SduiSmartRail } from "../blocks/SduiSmartRail";

type BlockComponent<B extends SduiBlock> = ComponentType<{ block: B }>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlockComponent = ComponentType<{ block: any }>;

export const BLOCK_REGISTRY: Record<SduiBlock["type"], AnyBlockComponent> = {
  hero: SduiHeroBlock as BlockComponent<SduiBlock> as AnyBlockComponent,
  bento_grid: SduiBentoBlock as BlockComponent<SduiBlock> as AnyBlockComponent,
  smart_rail: SduiSmartRail as BlockComponent<SduiBlock> as AnyBlockComponent,
};

export function resolveBlock(type: SduiBlock["type"]): AnyBlockComponent | null {
  return BLOCK_REGISTRY[type] ?? null;
}
