/**
 * Salsabil OS — Phase 1 · Wave 2
 * Layer 4 (Domain) · Sovereign Cart Runtime.
 *
 * Single source of truth for cart orchestration. Replaces the legacy
 * CartContext / useCartOrchestrator scatter. UI components dispatch intents
 * (add/remove/setQty/clear/setContext) and subscribe to snapshot updates.
 *
 * Hard invariants:
 *   1. ALL pricing math delegated to {@link CashierBrain.calculateCart}.
 *      The runtime never multiplies price × qty itself.
 *   2. EVERY mutation emits a strictly-typed event on the sovereign event
 *      bus (append-only, no silent state changes).
 *   3. Vertical-agnostic — no product or vertical name appears in logic.
 *   4. Bytecode-portable — no React, no Supabase, no fetch.
 */

import { CashierBrain } from "@/core/cashier/domain/CashierBrain";
import type {
  CartLineInput,
  CartLineModifier,
  CartSnapshot,
  CashierContext,
  ProductFinancialDNA,
} from "@/core/cashier/domain/types";
import { emitSalsabilEvent, type SalsabilAppId } from "@/core/events";

export interface AddCartItemIntent {
  readonly lineId: string;
  readonly productId: string;
  readonly dna: ProductFinancialDNA;
  readonly qty: number;
  readonly modifiers?: ReadonlyArray<CartLineModifier>;
}

export interface CartRuntimeLine extends AddCartItemIntent {
  readonly addedAt: number;
}

export interface CartRuntimeState {
  readonly lines: ReadonlyArray<CartRuntimeLine>;
  readonly context: CashierContext;
  readonly snapshot: CartSnapshot;
}

export type CartRuntimeListener = (state: CartRuntimeState) => void;

const EMPTY_SNAPSHOT: CartSnapshot = {
  items: [],
  totals: {
    subtotal: 0,
    total_discount: 0,
    total_tax: 0,
    delivery_fee: 0,
    grand_total: 0,
  },
  currency: "EGP",
  snapshot_hash: "cb1_empty",
};

const DEFAULT_CONTEXT: CashierContext = { member_tier: "guest" };

const toCartLineInputs = (
  lines: ReadonlyArray<CartRuntimeLine>,
): CartLineInput[] =>
  lines.map((l) => ({
    id: l.lineId,
    dna: l.dna,
    qty: l.qty,
    modifiers: l.modifiers ? Array.from(l.modifiers) : undefined,
  }));

export class CartRuntime {
  private lines: CartRuntimeLine[] = [];
  private context: CashierContext = DEFAULT_CONTEXT;
  private snapshot: CartSnapshot = EMPTY_SNAPSHOT;
  private readonly listeners = new Set<CartRuntimeListener>();
  private readonly appId?: SalsabilAppId;
  private readonly clock: () => number;

  constructor(opts?: {
    readonly appId?: SalsabilAppId;
    readonly clock?: () => number;
    readonly initialContext?: CashierContext;
  }) {
    this.appId = opts?.appId;
    this.clock = opts?.clock ?? (() => Date.now());
    if (opts?.initialContext) this.context = opts.initialContext;
  }

  /* ───────── intents ───────── */

  add(intent: AddCartItemIntent): CartRuntimeState {
    const existing = this.lines.find((l) => l.lineId === intent.lineId);
    if (existing) {
      return this.setQty(intent.lineId, existing.qty + Math.max(0, intent.qty));
    }
    const line: CartRuntimeLine = {
      ...intent,
      qty: Math.max(0, Math.floor(intent.qty)),
      addedAt: this.clock(),
    };
    this.lines = [...this.lines, line];
    emitSalsabilEvent("cart.item.added", {
      lineId: line.lineId,
      productId: line.productId,
      qty: line.qty,
      appId: this.appId,
    });
    return this.recompute();
  }

  remove(lineId: string): CartRuntimeState {
    const existing = this.lines.find((l) => l.lineId === lineId);
    if (!existing) return this.currentState();
    this.lines = this.lines.filter((l) => l.lineId !== lineId);
    emitSalsabilEvent("cart.item.removed", {
      lineId,
      productId: existing.productId,
      appId: this.appId,
    });
    return this.recompute();
  }

  setQty(lineId: string, qty: number): CartRuntimeState {
    const existing = this.lines.find((l) => l.lineId === lineId);
    if (!existing) return this.currentState();
    const nextQty = Math.max(0, Math.floor(qty));
    if (nextQty === 0) return this.remove(lineId);
    if (nextQty === existing.qty) return this.currentState();
    const previousQty = existing.qty;
    this.lines = this.lines.map((l) =>
      l.lineId === lineId ? { ...l, qty: nextQty } : l,
    );
    emitSalsabilEvent("cart.item.qty_changed", {
      lineId,
      productId: existing.productId,
      qty: nextQty,
      previousQty,
      appId: this.appId,
    });
    return this.recompute();
  }

  clear(): CartRuntimeState {
    if (this.lines.length === 0) return this.currentState();
    const itemCount = this.lines.length;
    this.lines = [];
    emitSalsabilEvent("cart.cleared", { itemCount, appId: this.appId });
    return this.recompute();
  }

  setContext(context: CashierContext): CartRuntimeState {
    this.context = context;
    return this.recompute();
  }

  /* ───────── observation ───────── */

  getState(): CartRuntimeState {
    return this.currentState();
  }

  subscribe(listener: CartRuntimeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /* ───────── internals ───────── */

  private currentState(): CartRuntimeState {
    return {
      lines: this.lines,
      context: this.context,
      snapshot: this.snapshot,
    };
  }

  private recompute(): CartRuntimeState {
    this.snapshot = this.lines.length
      ? CashierBrain.calculateCart(toCartLineInputs(this.lines), this.context)
      : EMPTY_SNAPSHOT;
    emitSalsabilEvent("cart.updated", {
      itemCount: this.lines.length,
      grandTotal: this.snapshot.totals.grand_total,
      currency: this.snapshot.currency,
      snapshotHash: this.snapshot.snapshot_hash,
      appId: this.appId,
    });
    const state = this.currentState();
    for (const l of this.listeners) l(state);
    return state;
  }
}

/** Process-singleton for app-wide consumers (POS, Storefront, KDS). */
export const cartRuntime = new CartRuntime({ appId: "reef" });
