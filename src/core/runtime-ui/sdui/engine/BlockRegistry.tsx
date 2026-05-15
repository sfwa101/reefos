/**
 * SduiBlockRegistry — runtime-pluggable map of `block.type` → renderer.
 *
 * Constitution v5.1 / Article 2 (Kernel Purity): the kernel registers only
 * the core, app-agnostic blocks via `registerCoreSduiBlocks()`. Vertical
 * apps (e.g. `reef-al-madina`) register their own renderers at boot via
 * `sduiBlockRegistry.register(type, renderer)`. The renderer here never
 * imports from `@/apps/*`.
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
import { SduiPredictiveRefillRail } from "../blocks/offers/SduiPredictiveRefillRail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SduiRenderer = (block: any) => ReactElement | null;

class SduiBlockRegistryClass {
  private map = new Map<string, SduiRenderer>();

  register<T extends SduiBlock["type"]>(
    type: T,
    renderer: (block: Extract<SduiBlock, { type: T }>) => ReactElement | null,
  ): void {
    this.map.set(type, renderer as SduiRenderer);
  }

  render(block: SduiBlock): ReactElement | null {
    const r = this.map.get(block.type);
    return r ? r(block) : null;
  }
}

export const sduiBlockRegistry = new SduiBlockRegistryClass();

let coreRegistered = false;
export function registerCoreSduiBlocks(): void {
  if (coreRegistered) return;
  sduiBlockRegistry.register("hero", (b) => <SduiHeroBlock block={b} />);
  sduiBlockRegistry.register("bento_grid", (b) => <SduiBentoBlock block={b} />);
  sduiBlockRegistry.register("smart_rail", (b) => <SduiSmartRail block={b} />);
  sduiBlockRegistry.register("modifier_group", (b) => <SduiModifierBlock block={b} />);
  sduiBlockRegistry.register("app_grid", (b) => <SduiAppGridBlock block={b} />);
  sduiBlockRegistry.register("omni_search", (b) => <SduiOmniSearchBlock block={b} />);
  sduiBlockRegistry.register("unified_status", () => <SduiUnifiedStatusBlock />);
  sduiBlockRegistry.register("barq_tracking", (b) => <SduiBarqTrackingBlock block={b} />);
  sduiBlockRegistry.register("predictive_refill_rail", (b) => (
    <SduiPredictiveRefillRail block={b} />
  ));
  coreRegistered = true;
}

// Auto-register on module load to preserve existing import behaviour.
registerCoreSduiBlocks();

export function renderBlock(block: SduiBlock): ReactElement | null {
  return sduiBlockRegistry.render(block);
}
