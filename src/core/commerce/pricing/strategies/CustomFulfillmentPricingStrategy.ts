/**
 * CustomFulfillmentPricingStrategy
 * ----------------------------------------------------------------
 * Translates the legacy `src/lib/sweetsFulfillment.ts` rules into
 * pure engine modifiers. Read-only consumption — no mutation.
 *
 * Domain rules captured here (one-to-one with the legacy module):
 *
 *   • Type A (ready stock)  → no extra modifiers, instant delivery.
 *   • Type B (made fresh)   → optional fresh-prep fee per unit (when the
 *                              customer adds custom prep / urgency tier).
 *   • Type C (pre-order)    → MANDATORY booking → emits a `deposit`
 *                              modifier when bookingSubtotal ≥ DEPOSIT_THRESHOLD,
 *                              optional booking when below threshold.
 *
 * Customizations (writing on cake, candle pack, gift wrap, message card)
 * arrive as `addons[]` in the selection — each one becomes a `line_addon`
 * modifier so the receipt itemises them and Hakim-AI can audit.
 *
 * Why a strategy: the legacy `computeSweetsRules` returns aggregate cart
 * rules (blockCOD, depositAmount, …) — useful for checkout, but the
 * per-line breakdown lives nowhere. The strategy emits per-line modifiers
 * so the cart can sum them into the same aggregate later, while exposing
 * a transparent unit-by-unit audit trail.
 */

import {
  DEPOSIT_PCT,
  DEPOSIT_THRESHOLD,
  fulfillmentMeta,
  fulfillmentTypeFor,
  isSweetsProduct,
  type FulfillmentType,
} from "@/core/commerce/variants/custom-fulfillment-rules";
import type {
  IPricingStrategy,
  PricingContext,
  PricingModifier,
  PricingSelection,
} from "../types";

/** A single customization line picked by the customer (writing, candles…). */
export interface SweetsAddon {
  readonly id: string;
  readonly label: string;
  /** Absolute EGP added to the line total. */
  readonly price: number;
}

/** Optional booking slot — required for Type C, ignored otherwise. */
export interface SweetsBooking {
  /** ISO date string (YYYY-MM-DD) of the pickup day. */
  readonly date: string;
  /** Slot id from `bookingTimeSlots` (morning/noon/evening/night). */
  readonly slotId: string;
}

export interface CustomFulfillmentSelection extends PricingSelection {
  /** Optional explicit override; defaults to `fulfillmentTypeFor(...)`. */
  readonly fulfillmentType?: FulfillmentType;
  readonly addons?: ReadonlyArray<SweetsAddon>;
  /** Optional fresh-prep urgency surcharge for Type B (per unit). */
  readonly freshPrepFee?: number;
  /** Required for Type C; engine throws if missing. */
  readonly booking?: SweetsBooking;
}

export class CustomFulfillmentPricingStrategy
  implements IPricingStrategy<CustomFulfillmentSelection>
{
  readonly key = "sweets";

  canHandle(context: PricingContext): boolean {
    return isSweetsProduct(context.product.source);
  }

  buildModifiers(
    selection: Readonly<CustomFulfillmentSelection>,
    context: PricingContext,
  ): ReadonlyArray<PricingModifier> {
    const product = context.product;
    const type =
      selection.fulfillmentType ??
      fulfillmentTypeFor(product.id, product.subCategory);
    const meta = fulfillmentMeta[type];

    const out: PricingModifier[] = [];

    // 1. Customizations — itemized addons (writing, candles, wrap…).
    if (selection.addons && selection.addons.length > 0) {
      for (const a of selection.addons) {
        if (a.price <= 0) continue;
        out.push({
          id: `sweets:addon:${a.id}`,
          label: a.label,
          kind: "line_addon",
          amount: a.price,
        });
      }
    }

    // 2. Type B fresh-prep urgency — additive PER UNIT (kitchen labour).
    if (type === "B" && selection.freshPrepFee && selection.freshPrepFee > 0) {
      out.push({
        id: "sweets:fresh-prep",
        label: "تحضير طازج فوري",
        kind: "unit_delta",
        amount: selection.freshPrepFee,
        meta: { fulfillmentType: "B" },
      });
    }

    // 3. Type C booking — MANDATORY. Emit the deposit on the line so the
    //    cart can aggregate per-line deposits into `bookingSubtotal` and
    //    apply the legacy blockCOD / showDepositNotice rules at checkout.
    if (type === "C") {
      if (!selection.booking) {
        throw new Error(
          `CustomFulfillmentPricingStrategy: product "${product.id}" requires a booking (date + slot)`,
        );
      }
      const lineSubtotal = product.price * selection.quantity;
      const depositRequired = lineSubtotal >= DEPOSIT_THRESHOLD;
      const depositAmount = Math.round(lineSubtotal * DEPOSIT_PCT);

      out.push({
        id: "sweets:booking-deposit",
        label: depositRequired
          ? `عربون مطلوب (${Math.round(DEPOSIT_PCT * 100)}%)`
          : `عربون اختياري (${Math.round(DEPOSIT_PCT * 100)}%)`,
        kind: "deposit",
        amount: depositAmount,
        meta: {
          fulfillmentType: "C",
          required: depositRequired,
          bookingDate: selection.booking.date,
          bookingSlot: selection.booking.slotId,
          minLeadHours: meta.minLeadHours,
          blocksCOD: true,
        },
      });
    }

    return out;
  }
}
