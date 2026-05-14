/**
 * BulkTierPricingStrategy
 * ----------------------------------------------------------------
 * Bulk-quantity pricing for the wholesale vertical and any retail SKU
 * eligible for a volume deal.
 *
 * Two orthogonal mechanisms are supported here — they CAN compose:
 *
 *   1. Volume deals (legacy `src/lib/volumeDeals.ts`)
 *      → "Buy N save X EGP" — translated into a `discount` modifier
 *        scoped to the line. Applied as many times as the customer hits
 *        the bundle threshold (e.g. buy 12 water, save 36).
 *
 *   2. Tier breaks (passed via selection — wholesale catalog defines them)
 *      → Per-unit price reduction once quantity crosses each tier.
 *        Emitted as a `unit_delta` with NEGATIVE amount, so the engine's
 *        additive pipeline naturally lowers the unit price.
 *
 * Why a strategy: legacy code computes volume savings ad-hoc inside
 * cart components — invisible to receipts, analytics, and Hakim-AI.
 * This strategy makes every bulk decision an explicit modifier.
 */

import type { Product, ProductSource } from "@/core/catalog/legacyProduct.types";
import {
  volumeDealFor,
  type VolumeDeal,
} from "@/lib/volumeDeals";
import type {
  IPricingStrategy,
  PricingContext,
  PricingInput,
  PricingModifier,
  PricingSelection,
} from "../types";

/**
 * Build a minimal `Product` envelope for the legacy `volumeDealFor`
 * helper, which only inspects `id` and `subCategory`. Wave P-C/P-E will
 * widen the helper to accept `PricingInput` directly.
 */
const toLegacyProductShape = (p: PricingInput): Product => ({
  id: p.id,
  name: "",
  unit: p.unit ?? "",
  price: p.price,
  oldPrice: p.oldPrice,
  image: "",
  category: "",
  subCategory: p.subCategory,
  source: p.source as ProductSource,
  metadata: p.metadata,
});

/** A wholesale tier break supplied by the catalog (e.g. ≥12 → -3 EGP/unit). */
export interface WholesaleTierBreak {
  readonly minQty: number;
  /** Absolute EGP discount per unit (positive number, applied as negative). */
  readonly perUnitDiscount: number;
  readonly label?: string;
}

export interface BulkTierSelection extends PricingSelection {
  /** Optional tier breaks — typically loaded from `product_variants` meta. */
  readonly tierBreaks?: ReadonlyArray<WholesaleTierBreak>;
  /**
   * Opt-in flag — defaults to true. When false, volume deals from the
   * legacy `volumeDeals.ts` registry are skipped (used for B2B accounts
   * that already get a wholesale price).
   */
  readonly applyVolumeDeals?: boolean;
}

export class BulkTierPricingStrategy
  implements IPricingStrategy<BulkTierSelection>
{
  readonly key = "wholesale";

  canHandle(context: PricingContext): boolean {
    if (context.product.source === "wholesale") return true;
    // Also handle any retail product carrying a configured volume deal —
    // lets supermarket SKUs benefit from the same audit-friendly path.
    return volumeDealFor(toLegacyProductShape(context.product)) !== null;
  }

  buildModifiers(
    selection: Readonly<BulkTierSelection>,
    context: PricingContext,
  ): ReadonlyArray<PricingModifier> {
    const out: PricingModifier[] = [];
    const qty = selection.quantity;

    // 1. Tier breaks — pick the BEST applicable tier (highest minQty hit).
    const best = this.bestTier(selection.tierBreaks, qty);
    if (best) {
      out.push({
        id: `wholesale:tier:${best.minQty}`,
        label:
          best.label ??
          `خصم الكمية (${best.minQty}+ → -${best.perUnitDiscount} ج للوحدة)`,
        kind: "unit_delta",
        amount: -Math.abs(best.perUnitDiscount),
        meta: { tierMinQty: best.minQty },
      });
    }

    // 2. Legacy volume deal — applied as repeated bundle savings.
    const allowVolume = selection.applyVolumeDeals ?? true;
    if (allowVolume) {
      const deal = volumeDealFor(toLegacyProductShape(context.product));
      if (deal) {
        const bundleSavings = this.computeBundleSavings(deal, qty);
        if (bundleSavings > 0) {
          const bundles = Math.floor(qty / deal.buy);
          out.push({
            id: `wholesale:vol:${deal.buy}-${deal.save}`,
            label: `عرض اشترِ ${deal.buy} ووفّر ${deal.save} ج × ${bundles}`,
            kind: "discount",
            amount: bundleSavings,
            percent: false,
            meta: {
              ruleType: "volume-deal",
              bundleQty: deal.buy,
              bundleSave: deal.save,
              appliedBundles: bundles,
              scope: "line",
            },
          });
        }
      }
    }

    return out;
  }

  private bestTier(
    breaks: ReadonlyArray<WholesaleTierBreak> | undefined,
    qty: number,
  ): WholesaleTierBreak | null {
    if (!breaks || breaks.length === 0) return null;
    let winner: WholesaleTierBreak | null = null;
    for (const b of breaks) {
      if (qty < b.minQty) continue;
      if (!winner || b.minQty > winner.minQty) winner = b;
    }
    return winner;
  }

  private computeBundleSavings(deal: VolumeDeal, qty: number): number {
    if (deal.buy <= 0 || deal.save <= 0) return 0;
    const bundles = Math.floor(qty / deal.buy);
    return bundles * deal.save;
  }
}
