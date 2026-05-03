/**
 * MeatPricingStrategy — Proof of Concept
 * ----------------------------------------------------------------
 * Translates the legacy `computeButcheryPrice` (src/lib/butcheryPrep.ts)
 * into a pure Strategy that emits engine modifiers.
 *
 * Read-only consumption of the legacy module: we import the typed rule
 * shapes and the rule resolver (`getButcheryRules`) to avoid duplicating
 * the per-subCategory data. NO mutation of the legacy module.
 *
 * Why a strategy: meat pricing combines four orthogonal modifiers
 * (weight factor, prep delta, conditional addons, packaging fee) plus a
 * cross-sell list. The legacy implementation collapses them into a
 * single rounded number — losing the audit trail. The strategy preserves
 * each modifier so receipts, analytics, and Hakim-AI can introspect.
 */

import type { Product } from "@/lib/products";
import {
  getButcheryRules,
  isButcheryProduct,
  type ButcheryRules,
  type PrepOption,
  type WeightOption,
} from "@/lib/butcheryPrep";
import type {
  IPricingStrategy,
  PricingContext,
  PricingModifier,
  PricingSelection,
} from "../types";

export interface MeatSelection extends PricingSelection {
  readonly weight: WeightOption;
  readonly prep: PrepOption;
  readonly addonIds: ReadonlyArray<string>;
  readonly packagingId: string;
  /** Optional cross-sell ids the customer ticked next to the cut. */
  readonly crossSellIds?: ReadonlyArray<string>;
}

export class MeatPricingStrategy
  implements IPricingStrategy<MeatSelection>
{
  readonly key = "meat";

  canHandle(context: PricingContext): boolean {
    return isButcheryProduct(context.product.source);
  }

  buildModifiers(
    selection: Readonly<MeatSelection>,
    context: PricingContext,
  ): ReadonlyArray<PricingModifier> {
    const rules = this.requireRules(context.product);
    const out: PricingModifier[] = [];

    // 1. Weight multiplier — applied to base price per kilo.
    out.push({
      id: `meat:weight:${selection.weight.id}`,
      label: selection.weight.label,
      kind: "weight_factor",
      amount: selection.weight.factor,
    });

    // 2. Prep delta — additive per unit (cubes, mince, marinate…).
    if (selection.prep.price > 0) {
      out.push({
        id: `meat:prep:${selection.prep.id}`,
        label: selection.prep.label,
        kind: "unit_delta",
        amount: selection.prep.price,
        meta: { tier: selection.prep.tier },
      });
    }

    // 3. Addons — only those actually picked AND not disabled by the prep.
    const disabled = new Set(selection.prep.disables ?? []);
    const picked = new Set(selection.addonIds);
    for (const a of rules.addons) {
      if (!picked.has(a.id) || disabled.has(a.id) || a.price <= 0) continue;
      out.push({
        id: `meat:addon:${a.id}`,
        label: a.label,
        kind: "line_addon",
        amount: a.price,
      });
    }

    // 4. Packaging — line-level fee (vacuum, etc.). Free packaging skipped.
    const pkg = rules.packaging.find((p) => p.id === selection.packagingId);
    if (pkg && pkg.price > 0) {
      out.push({
        id: `meat:pkg:${pkg.id}`,
        label: pkg.label,
        kind: "line_addon",
        amount: pkg.price,
      });
    }

    // 5. Cross-sells — optional, sit beside the line.
    if (selection.crossSellIds && selection.crossSellIds.length > 0) {
      const picked = new Set(selection.crossSellIds);
      for (const c of rules.crossSell) {
        if (!picked.has(c.id)) continue;
        out.push({
          id: `meat:xsell:${c.id}`,
          label: c.label,
          kind: "cross_sell",
          amount: c.price,
        });
      }
    }

    // 6. Cold-chain fee for perishable zones — only if zone refuses
    //    perishables we'd never reach this code, so the inverse holds:
    //    add a small surcharge when zone explicitly accepts perishables
    //    AND the prep tier is "cook" (warm prep needs insulated bag).
    if (
      context.zoneAcceptsPerishables === true &&
      selection.prep.tier === "cook"
    ) {
      out.push({
        id: "meat:fee:insulated",
        label: "تغليف حراري للوصفات الجاهزة",
        kind: "fee",
        amount: 10,
      });
    }

    return out;
  }

  private requireRules(product: Product): ButcheryRules {
    const rules = getButcheryRules(product);
    if (!rules) {
      throw new Error(
        `MeatPricingStrategy: product "${product.id}" is not a butchery item`,
      );
    }
    return rules;
  }
}
