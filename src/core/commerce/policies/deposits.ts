/**
 * Salsabil OS — Wave P-1.4 · Deposit Policy Helpers.
 *
 * Layer 4 (Domain). Single source of truth for "how much do we ask up-front?"
 * percentages. UI MUST import these — never inline `price * 0.25` or
 * `price * 0.15` in a React render path (Law 3 — Presentation Purity).
 */
const round = (n: number): number => Math.round(n);

/** Default percentage taken as a deposit on a pre-order (home goods etc.). */
export const PREORDER_DEPOSIT_PCT = 25;

/** Default percentage of the retail price quoted as a borrow starting fee. */
export const BORROW_FROM_PCT = 15;

/** Pre-order deposit amount (rounded to whole units of currency). */
export function preorderDepositAmount(
  price: number,
  pct: number = PREORDER_DEPOSIT_PCT,
): number {
  const safe = Number.isFinite(price) ? Math.max(0, price) : 0;
  return round((safe * pct) / 100);
}

/** Remainder owed at delivery once the pre-order deposit is paid. */
export function preorderRemainderAmount(
  price: number,
  pct: number = PREORDER_DEPOSIT_PCT,
): number {
  const safe = Number.isFinite(price) ? Math.max(0, price) : 0;
  return Math.max(0, round(safe - preorderDepositAmount(safe, pct)));
}

/** "Borrow from X" headline price — domain-level marketing rate. */
export function borrowStartingPrice(
  price: number,
  pct: number = BORROW_FROM_PCT,
): number {
  const safe = Number.isFinite(price) ? Math.max(0, price) : 0;
  return round((safe * pct) / 100);
}

/**
 * Wave P-1.5 — Booking deposit split.
 *
 * Used by sweets-sheet (and any future "pay deposit now / remainder later"
 * flow). `pctFraction` is a fraction (e.g. 0.5 for 50%), NOT a percentage
 * — preserves legacy `DEPOSIT_PCT` semantics from custom-fulfillment-rules.
 */
export interface BookingDepositSplit {
  readonly depositAmount: number;
  readonly remainderAmount: number;
}

export function bookingDepositSplit(
  lineTotal: number,
  pctFraction: number,
): BookingDepositSplit {
  const safe = Number.isFinite(lineTotal) ? Math.max(0, lineTotal) : 0;
  const depositAmount = Math.round(safe * pctFraction);
  const remainderAmount = Math.max(0, safe - depositAmount);
  return { depositAmount, remainderAmount };
}

/**
 * Wave P-1.5 — Group-buy escrow lock amount.
 *
 * Pure policy: how much to freeze in the participant's wallet for a pledge
 * of `qty` units at `currentPrice`. Lives in the policy layer so the
 * pledge dialog (and any future bulk-pledge surface) consume one source.
 */
export function groupBuyEscrowAmount(
  currentPricePerUnit: number,
  qty: number,
): number {
  const safePrice = Number.isFinite(currentPricePerUnit) ? Math.max(0, currentPricePerUnit) : 0;
  const safeQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
  return Math.round(safePrice * safeQty * 100) / 100;
}
