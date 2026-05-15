/**
 * Salsabil OS — Wave P-1.2 · Domain → Modifier Adapters.
 *
 * Each adapter takes a domain-specific selection (butchery prep, sweets
 * booking, library borrow) and returns a unified `Modifier[]` array
 * consumable by `calculateUniversalPrice` (or by the orchestrator after
 * structural projection to `PricingModifier`).
 *
 * Constitutional source of truth — relocated from the destroyed
 * `src/lib/pricingAdapters.ts` to enforce Law 9 across the pricing
 * namespace. Behavior is byte-for-byte identical.
 */

import {
  calculateUniversalPrice,
  mod,
  type Modifier,
  type ModifierBreakdown,
} from "./modifiers";
import type {
  ButcheryRules,
  PrepOption,
  WeightOption,
} from "@/core/commerce/variants/weighed-prep-rules";
import {
  BORROW_DURATIONS,
  BORROW_DEPOSIT_RATIO,
  type BorrowDuration,
} from "@/lib/digital-borrowing";

/* =============== Butchery → modifiers =============== */

export function butcheryToModifiers(
  weight: WeightOption,
  prep: PrepOption,
  addonIds: string[],
  rules: ButcheryRules,
  packagingId: string,
): Modifier[] {
  const out: Modifier[] = [
    mod.weight(`weight:${weight.id}`, weight.label, weight.factor),
  ];
  if (prep.price > 0) {
    out.push(mod.prep(`prep:${prep.id}`, prep.label, prep.price));
  }
  for (const a of rules.addons.filter((x) => addonIds.includes(x.id))) {
    if (a.price > 0) out.push(mod.addon(`addon:${a.id}`, a.label, a.price));
  }
  const pkg = rules.packaging.find((p) => p.id === packagingId);
  if (pkg && pkg.price > 0) {
    out.push(mod.addon(`pkg:${pkg.id}`, pkg.label, pkg.price));
  }
  return out;
}

/* =============== Library borrow → modifiers =============== */

export function libraryBorrowToModifiers(
  bookPrice: number,
  duration: BorrowDuration,
): Modifier[] {
  const cfg = BORROW_DURATIONS.find((d) => d.id === duration)!;
  const rental = Math.round(bookPrice * cfg.ratio);
  const deposit = Math.round(bookPrice * BORROW_DEPOSIT_RATIO);
  return [
    mod.addon(`borrow-fee:${duration}`, `إيجار ${cfg.label}`, rental),
    mod.deposit(
      `borrow-deposit:${duration}`,
      "تأمين قابل للاسترجاع",
      deposit,
      { refundable: true, duration },
    ),
  ];
}

/* =============== Sweets booking → modifiers =============== */

export function sweetsBookingToModifiers(opts: {
  bookingSubtotal: number;
  depositPct: number;
  threshold: number;
  cakeMessage?: string;
  cakeMessageFee?: number;
}): Modifier[] {
  const out: Modifier[] = [];
  if (opts.cakeMessage && (opts.cakeMessageFee ?? 0) > 0) {
    out.push(
      mod.addon(
        "cake-message",
        `رسالة على التورتة: ${opts.cakeMessage}`,
        opts.cakeMessageFee!,
      ),
    );
  }
  if (opts.bookingSubtotal >= opts.threshold) {
    const dep = Math.round(opts.bookingSubtotal * opts.depositPct);
    out.push(
      mod.deposit("cake-deposit", "عربون مقدم", dep, {
        percent: opts.depositPct,
        thresholdMet: true,
      }),
    );
  }
  return out;
}

/* =============== POLYMORPHIC composition =============== */

/**
 * Compose ANY combination of modifier sources for a single product.
 * Demonstrates how a frankenstein product (butchery + cake message
 * + library deposit) prices correctly through the SAME pipeline.
 */
export function composeUniversal(
  basePrice: number,
  qty: number,
  ...modifierGroups: Modifier[][]
): ModifierBreakdown {
  const merged = modifierGroups.flat();
  return calculateUniversalPrice(basePrice, merged, qty);
}
