/**
 * Salsabil OS — Constitution v2.0 · Article 12.1
 * Layer 4 (Domain) · Cashier Brain — pure mathematical core.
 *
 * Hard invariants:
 *   1. Determinism — same input always yields same output (no Date.now,
 *      no Math.random, no I/O).
 *   2. Same-bytecode rule — importable from browser AND edge bundles.
 *      No React, no Supabase, no fetch.
 *   3. Pure (Input) ⇒ Output state machine.
 */

import type {
  CartLineInput,
  CartLineSnapshot,
  CartSnapshot,
  CartTotals,
  CashierContext,
  MemberTier,
} from "./types";
import {
  makeCapabilityView,
  resolvePOSMode,
  type POSCapabilityView,
  type POSMode,
} from "./POSMode";
import type { CapabilityKey } from "@/core/capabilities/CapabilityRegistry";

/* ─────────────────────────── Helpers ─────────────────────────── */

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Member tier → flat % discount applied at line subtotal level. */
const tierDiscountPct: Record<MemberTier, number> = {
  guest: 0,
  bronze: 0,
  silver: 0.05,
  gold: 0.075,
  vip: 0.1,
};

/** Tax class → flat tax rate (MVP table; extend via DNA.pricing_rules later). */
const taxRateFor = (taxClass: string | null | undefined): number => {
  switch (taxClass) {
    case "zero":
    case "exempt":
      return 0;
    case "standard":
      return 0; // Egypt VAT not applied to retail food MVP
    default:
      return 0;
  }
};

/**
 * Deterministic FNV-1a 32-bit hash → base36 string.
 * Pure JS, no crypto module required (works in any runtime).
 */
const fnv1aHash = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
};

/* ─────────────────────────── Core ─────────────────────────── */

/**
 * Calculate one cart line in isolation. Pure.
 */
export function calculateLine(
  line: CartLineInput,
  tierPct: number,
): CartLineSnapshot {
  const modifierDelta = (line.modifiers ?? []).reduce(
    (sum, m) => sum + (Number.isFinite(m.unit_price_delta) ? m.unit_price_delta : 0),
    0,
  );
  const unit_price = round2(Math.max(0, line.dna.base_price + modifierDelta));
  const qty = Math.max(0, Math.floor(line.qty));
  const line_subtotal = round2(unit_price * qty);
  const line_discount = round2(line_subtotal * tierPct);
  const taxable = Math.max(0, line_subtotal - line_discount);
  const line_tax = round2(taxable * taxRateFor(line.dna.tax_class));
  const line_total = round2(line_subtotal - line_discount + line_tax);

  return {
    id: line.id,
    qty,
    unit_price,
    line_subtotal,
    line_discount,
    line_tax,
    line_total,
  };
}

/**
 * Calculate the entire cart. Pure (Input, Context) ⇒ CartSnapshot.
 */
export function calculateCart(
  lines: CartLineInput[],
  context: CashierContext,
): CartSnapshot {
  const tierPct = tierDiscountPct[context.member_tier] ?? 0;
  const items = lines.map((l) => calculateLine(l, tierPct));

  const subtotal = round2(items.reduce((s, i) => s + i.line_subtotal, 0));
  const total_discount = round2(items.reduce((s, i) => s + i.line_discount, 0));
  const total_tax = round2(items.reduce((s, i) => s + i.line_tax, 0));
  const delivery_fee = round2(Math.max(0, context.delivery_fee ?? 0));
  const grand_total = round2(
    subtotal - total_discount + total_tax + delivery_fee,
  );

  const totals: CartTotals = {
    subtotal,
    total_discount,
    total_tax,
    delivery_fee,
    grand_total,
  };

  const currency =
    context.currency ?? lines[0]?.dna.currency ?? "EGP";

  // Deterministic fingerprint over the canonical totals + line ids/qty.
  const fingerprintInput = JSON.stringify({
    c: currency,
    t: totals,
    i: items.map((i) => [i.id, i.qty, i.unit_price, i.line_total]),
    ctx: {
      tier: context.member_tier,
      coupon: context.coupon_code ?? null,
      zone: context.delivery_zone_id ?? null,
    },
  });
  const snapshot_hash = `cb1_${fnv1aHash(fingerprintInput)}`;

  return { items, totals, currency, snapshot_hash };
}

/**
 * Class-style facade for callers that prefer OO ergonomics.
 * The class holds NO state — it is a pure dispatcher.
 */
export class CashierBrain {
  static calculateCart(
    lines: CartLineInput[],
    context: CashierContext,
  ): CartSnapshot {
    return calculateCart(lines, context);
  }

  static calculateLine(line: CartLineInput, tierPct = 0): CartLineSnapshot {
    return calculateLine(line, tierPct);
  }
}
