/**
 * Salsabil OS — Constitution v2.0 · Wave B-3.5 + Phase 1 · Wave 4
 * Layer 4 (Runtime) · Checkout Engine.
 *
 * Two responsibilities live here:
 *   1. PURE rail math (Wave B-3.5) — `computeCheckoutRails`,
 *      `computeChargeableAmount`. UI captures intent, math lives here.
 *   2. CHECKOUT ORCHESTRATOR (Wave 4) — converts a CartRuntime snapshot
 *      into a finalized Order, validates totals via CashierBrain, appends
 *      the financial movement to the LedgerGateway with a strict
 *      idempotency key, and emits `order.placed`.
 *
 * Constitutional guarantees:
 *  - Zero React imports, zero hooks, zero DB I/O at this layer.
 *  - Pure rail functions: same input ⇒ same output.
 *  - Orchestrator NEVER updates or deletes financial records.
 */

import { CashierBrain } from "@/core/cashier/domain/CashierBrain";
import type {
  CartLineInput,
  CartSnapshot,
  CashierContext,
} from "@/core/cashier/domain/types";
import {
  ledgerGateway as defaultLedger,
  type LedgerGateway,
  type LedgerTransaction,
} from "@/core/finance/gateway/LedgerGateway";
import {
  cartRuntime as defaultCart,
  type CartRuntime,
  type CartRuntimeLine,
} from "./CartRuntime";
import { emitSalsabilEvent, type SalsabilAppId } from "@/core/events";

/* ───────── Pure rail math (preserved) ───────── */

export interface CheckoutRailInput {
  effectiveGrand: number;
  tip: number;
  charity: number;
}

export interface CheckoutRailTotals {
  baseTotal: number;
  tipRailTotal: number;
  charityRailTotal: number;
}

const round = (n: number) => Math.round(n);

export function computeCheckoutRails(input: CheckoutRailInput): CheckoutRailTotals {
  const baseTotal = round(input.effectiveGrand - input.tip - input.charity);
  const tipRailTotal = baseTotal;
  const charityRailTotal = baseTotal + input.tip;
  return { baseTotal, tipRailTotal, charityRailTotal };
}

export function computeChargeableAmount(effectiveGrand: number): number {
  return round(effectiveGrand);
}

/* ───────── Sovereign Checkout Orchestrator ───────── */

export type PaymentMethod = "cash" | "card" | "wallet" | "tayseer";

export interface CheckoutIntent {
  readonly idempotencyKey: string;
  readonly paymentMethod: PaymentMethod;
  readonly customerId?: string;
  readonly memo?: string;
}

export interface CheckoutResult {
  readonly orderId: string;
  readonly idempotencyKey: string;
  readonly snapshot: CartSnapshot;
  readonly transaction: LedgerTransaction;
  readonly paymentMethod: PaymentMethod;
}

export interface CheckoutRuntimeOptions {
  readonly cart?: CartRuntime;
  readonly ledger?: LedgerGateway;
  readonly appId?: SalsabilAppId;
  readonly clock?: () => number;
  readonly accountFor?: (method: PaymentMethod) => string;
  readonly orderIdFactory?: (idempotencyKey: string) => string;
}

const DEFAULT_ACCOUNT_FOR: (m: PaymentMethod) => string = (m) => `pos.${m}`;

const toLineInputs = (lines: ReadonlyArray<CartRuntimeLine>): CartLineInput[] =>
  lines.map((l) => ({
    id: l.lineId,
    dna: l.dna,
    qty: l.qty,
    modifiers: l.modifiers ? Array.from(l.modifiers) : undefined,
  }));

export class CheckoutRuntime {
  private readonly cart: CartRuntime;
  private readonly ledger: LedgerGateway;
  private readonly appId?: SalsabilAppId;
  private readonly clock: () => number;
  private readonly accountFor: (m: PaymentMethod) => string;
  private readonly orderIdFactory: (k: string) => string;

  constructor(opts?: CheckoutRuntimeOptions) {
    this.cart = opts?.cart ?? defaultCart;
    this.ledger = opts?.ledger ?? defaultLedger;
    this.appId = opts?.appId;
    this.clock = opts?.clock ?? (() => Date.now());
    this.accountFor = opts?.accountFor ?? DEFAULT_ACCOUNT_FOR;
    this.orderIdFactory =
      opts?.orderIdFactory ??
      ((k) => `ord_${this.clock().toString(36)}_${k.slice(0, 8)}`);
  }

  /** Generate a fresh idempotency key for a new checkout intent. */
  static newIdempotencyKey(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // Deterministic-enough fallback for legacy runtimes.
    const r = Math.random().toString(36).slice(2, 10);
    const t = Date.now().toString(36);
    return `idem_${t}_${r}`;
  }

  /**
   * Execute the checkout intent. Pure orchestration:
   *   1. Snapshot the cart.
   *   2. Re-validate totals via CashierBrain (server is the price judge —
   *      this is the client-side mirror; server checkout still re-runs).
   *   3. Append the financial movement to the LedgerGateway (idempotent).
   *   4. Emit `order.placed`.
   *   5. Clear the cart on success.
   */
  checkout(intent: CheckoutIntent): CheckoutResult {
    if (!intent.idempotencyKey) {
      throw new Error("CheckoutRuntime.checkout: idempotencyKey is required");
    }
    const state = this.cart.getState();
    if (state.lines.length === 0) {
      throw new Error("CheckoutRuntime.checkout: cart is empty");
    }

    // (2) Validation pass — totals MUST match the live snapshot.
    const validation: CartSnapshot = CashierBrain.calculateCart(
      toLineInputs(state.lines),
      state.context as CashierContext,
    );
    if (validation.snapshot_hash !== state.snapshot.snapshot_hash) {
      throw new Error(
        "CheckoutRuntime.checkout: snapshot hash drift — refusing to charge",
      );
    }

    const orderId = this.orderIdFactory(intent.idempotencyKey);

    // (3) Append-only financial movement.
    const transaction = this.ledger.appendEvent({
      idempotency_key: intent.idempotencyKey,
      order_id: orderId,
      account: this.accountFor(intent.paymentMethod),
      amount: validation.totals.grand_total,
      currency: validation.currency,
      direction: "credit",
      memo: intent.memo,
    });

    // (4) Emit sovereign event.
    emitSalsabilEvent("order.placed", {
      orderId,
      idempotencyKey: intent.idempotencyKey,
      grandTotal: validation.totals.grand_total,
      currency: validation.currency,
      itemCount: state.lines.length,
      paymentMethod: intent.paymentMethod,
      snapshotHash: validation.snapshot_hash,
      lines: state.lines.map((l) => ({
        lineId: l.lineId,
        productId: l.productId,
        name: l.name,
        qty: l.qty,
        capabilities: l.capabilities ?? [],
      })),
      appId: this.appId,
    });

    // (5) Clear the cart so the next intent starts clean.
    this.cart.clear();

    return {
      orderId,
      idempotencyKey: intent.idempotencyKey,
      snapshot: validation,
      transaction,
      paymentMethod: intent.paymentMethod,
    };
  }
}

/** Process-singleton for app-wide consumers. */
export const checkoutRuntime = new CheckoutRuntime({ appId: "reef" });
