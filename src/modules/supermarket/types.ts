// Supermarket module — shared types.
// Kept tiny on purpose: the heavy lifting (taxonomy, volume deals,
// wholesale tiers) lives in the central engines & lib layers.

import type { Product } from "@/lib/products";
import type { VolumeDeal } from "@/lib/volumeDeals";

export interface SupermarketSubGroup {
  readonly sub: { readonly id: string; readonly name: string };
  readonly items: ReadonlyArray<Product>;
}

export interface SupermarketGroup {
  readonly group: {
    readonly id: string;
    readonly name: string;
    readonly emoji: string;
    readonly color: {
      readonly hue: string;
      readonly tint: string;
      readonly ring: string;
    };
  };
  readonly subs: ReadonlyArray<SupermarketSubGroup>;
}

export interface ProductCardEntry {
  readonly product: Product;
  readonly volumeDeal: VolumeDeal | null;
}

// Sticky-rail metrics — duplicated from the legacy DualNavStore on purpose
// so the new module owns its own layout contract.
export const SUPERMARKET_NAV = {
  HEADER_OFFSET: 64,
  HEADER_GAP: 16,
  MAIN_BAR: 46,
  SUB_BAR: 40,
  // Total sticky stack height used as scroll-margin trigger for sections.
  TOTAL: 64 + 16 + 46 + 40 + 6,
} as const;
