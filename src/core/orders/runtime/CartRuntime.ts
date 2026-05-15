/**
 * Salsabil OS — Phase P-1.1.A · Sovereign Cart Runtime (V3 canonical).
 *
 * Layer 4 (Domain). Single source of truth for cart orchestration.
 *
 * V3 invariants (Law 9 / Sovereign Singularity):
 *   1. ALL pricing math delegated to {@link CashierBrain.calculateCart}.
 *      The runtime never multiplies price × qty itself.
 *   2. EVERY mutation emits a strictly-typed event on the sovereign event
 *      bus (append-only, no silent state changes).
 *   3. Vertical-agnostic kernel — NO product-name, category, vendor, or
 *      retail-branch knowledge is encoded in this file. Variant data is
 *      carried polymorphically through {@link CartLineKindData} and a
 *      sealed {@link CartLineExtensions} bag.
 *   4. Bytecode-portable — no React, no Supabase, no fetch.
 *
 * See: docs/adr/ADR-0003-CartRuntime-Canonical-VM.md
 */

import { CashierBrain } from "@/core/cashier/domain/CashierBrain";
import type {
  CartLineInput,
  CartLineModifier,
  CartSnapshot,
  CashierContext,
  ProductFinancialDNA,
} from "@/core/cashier/domain/types";
import type { JsonObject, JsonValue } from "@/core/commerce/knowledge/dna.types";
import { emitSalsabilEvent, type SalsabilAppId } from "@/core/events";

/* ────────────────────────────────────────────────────────────────────────
 * Polymorphic line-kind block (Kernel-Minimalism guardrail).
 *
 * The kernel knows ONLY the discriminator. Each branch carries its own
 * structured payload. Adding a new vertical means adding a member here +
 * a registry entry — never a kernel branch.
 * ────────────────────────────────────────────────────────────────────── */

export type CartLineKindData =
  | { readonly kind: "buy"; readonly variantId?: string; readonly addonIds?: ReadonlyArray<string> }
  | {
      readonly kind: "booking";
      readonly date: string;
      readonly slot?: string;
      readonly note?: string;
      readonly prepHours?: number;
      readonly payDeposit?: boolean;
    }
  | {
      readonly kind: "borrow";
      readonly duration: "3d" | "7d" | "14d";
      readonly days?: number;
      readonly deposit?: number;
    }
  | {
      readonly kind: "print";
      readonly config: {
        readonly pages: number;
        readonly copies: number;
        readonly colorMode: "bw" | "color";
        readonly sided: "single" | "double";
        readonly binding: "none" | "spiral" | "plastic" | "thermal";
        readonly fileName?: string;
        readonly filePath?: string;
      };
    };

export type CartLineKind = CartLineKindData["kind"];

/** Sealed metadata bag — value MUST be JSON-serialisable. */
export type CartLineExtensions = Readonly<Record<string, JsonValue>>;

/** Display snapshot — captured at add-to-cart time, vertical-agnostic. */
export interface CartLineDisplay {
  readonly capturedName?: string;
  readonly capturedImage?: string;
  readonly capturedPrice?: number;
  readonly capturedAt?: string;
  readonly unit?: string;
  readonly vendorId?: string;
}

export interface AddCartItemIntent {
  readonly lineId: string;
  readonly productId: string;
  readonly dna: ProductFinancialDNA;
  readonly qty: number;
  readonly modifiers?: ReadonlyArray<CartLineModifier>;
  /** Display name (i18n already resolved by caller). */
  readonly name?: string;
  /** Capability keys carried by this product (drives downstream routing). */
  readonly capabilities?: ReadonlyArray<string>;
  /** Polymorphic per-vertical block. Defaults to `{ kind: "buy" }`. */
  readonly kindData?: CartLineKindData;
  /** Display snapshot for offline / hydration-free rendering. */
  readonly display?: CartLineDisplay;
  /** Sealed JSON-serialisable extensions (consumer-defined). */
  readonly extensions?: CartLineExtensions;
}

export interface CartRuntimeLine extends AddCartItemIntent {
  readonly addedAt: number;
  readonly kindData: CartLineKindData;
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
const DEFAULT_KIND: CartLineKindData = { kind: "buy" };

const toCartLineInputs = (
  lines: ReadonlyArray<CartRuntimeLine>,
): CartLineInput[] =>
  lines.map((l) => ({
    id: l.lineId,
    dna: l.dna,
    qty: l.qty,
    modifiers: l.modifiers ? Array.from(l.modifiers) : undefined,
  }));

/**
 * Deterministic line identity. Two intents produce the same key iff they
 * are commercially fungible (same product + same variant + same booking
 * window + same print config + same borrow duration + same addon set).
 *
 * The kernel does NOT inspect addon meaning — only sorts the ids. New
 * verticals add a new `kindData.kind` and contribute their own discriminator.
 */
export function computeLineKey(intent: {
  readonly productId: string;
  readonly kindData?: CartLineKindData;
}): string {
  const k = intent.kindData ?? DEFAULT_KIND;
  const parts: string[] = [intent.productId, k.kind];
  switch (k.kind) {
    case "buy":
      parts.push(k.variantId ?? "", (k.addonIds ?? []).slice().sort().join(","));
      break;
    case "booking":
      parts.push(k.date, k.slot ?? "");
      break;
    case "borrow":
      parts.push(k.duration);
      break;
    case "print": {
      const c = k.config;
      parts.push(
        `${c.pages}-${c.copies}-${c.colorMode}-${c.sided}-${c.binding}-${c.fileName ?? ""}`,
      );
      break;
    }
  }
  return parts.join("|");
}

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
      kindData: intent.kindData ?? DEFAULT_KIND,
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

  /**
   * Patch the polymorphic blocks of a line (display / kindData / extensions).
   * Identity (productId, kind discriminator chosen at add-time) is preserved.
   */
  updateMeta(
    lineId: string,
    patch: {
      readonly display?: Partial<CartLineDisplay>;
      readonly kindData?: CartLineKindData;
      readonly extensions?: CartLineExtensions;
    },
  ): CartRuntimeState {
    const existing = this.lines.find((l) => l.lineId === lineId);
    if (!existing) return this.currentState();
    this.lines = this.lines.map((l) =>
      l.lineId === lineId
        ? {
            ...l,
            display:
              patch.display === undefined
                ? l.display
                : { ...(l.display ?? {}), ...patch.display },
            kindData: patch.kindData ?? l.kindData,
            extensions:
              patch.extensions === undefined
                ? l.extensions
                : { ...(l.extensions ?? {}), ...patch.extensions },
          }
        : l,
    );
    emitSalsabilEvent("cart.line.meta_updated", {
      lineId,
      productId: existing.productId,
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

  /**
   * Replace the entire cart with a new set of intents. Used by remote-sync,
   * "swap basket" actions, and Zustand → CartRuntime hydration on boot.
   */
  replaceAll(intents: ReadonlyArray<AddCartItemIntent>): CartRuntimeState {
    const now = this.clock();
    this.lines = intents.map((intent) => ({
      ...intent,
      kindData: intent.kindData ?? DEFAULT_KIND,
      qty: Math.max(0, Math.floor(intent.qty)),
      addedAt: now,
    }));
    emitSalsabilEvent("cart.replaced", {
      itemCount: this.lines.length,
      appId: this.appId,
    });
    return this.recompute();
  }

  setContext(context: CashierContext): CartRuntimeState {
    this.context = context;
    return this.recompute();
  }

  /* ───────── product-keyed convenience helpers (legacy bridge) ───────── */

  /** First line whose `productId` matches. */
  findByProductId(productId: string): CartRuntimeLine | undefined {
    return this.lines.find((l) => l.productId === productId);
  }

  /** Sum of `qty` across every line carrying `productId`. */
  qtyByProductId(productId: string): number {
    let n = 0;
    for (const l of this.lines) if (l.productId === productId) n += l.qty;
    return n;
  }

  removeByProductId(productId: string): CartRuntimeState {
    let touched = false;
    const next: CartRuntimeLine[] = [];
    for (const l of this.lines) {
      if (l.productId === productId) {
        touched = true;
        emitSalsabilEvent("cart.item.removed", {
          lineId: l.lineId,
          productId: l.productId,
          appId: this.appId,
        });
      } else {
        next.push(l);
      }
    }
    if (!touched) return this.currentState();
    this.lines = next;
    return this.recompute();
  }

  setQtyByProductId(productId: string, qty: number): CartRuntimeState {
    const line = this.findByProductId(productId);
    if (!line) return this.currentState();
    return this.setQty(line.lineId, qty);
  }

  updateMetaByProductId(
    productId: string,
    patch: {
      readonly display?: Partial<CartLineDisplay>;
      readonly kindData?: CartLineKindData;
      readonly extensions?: CartLineExtensions;
    },
  ): CartRuntimeState {
    const line = this.findByProductId(productId);
    if (!line) return this.currentState();
    return this.updateMeta(line.lineId, patch);
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

// Re-export JsonObject for adapters that need to widen extension payloads.
export type { JsonObject };
