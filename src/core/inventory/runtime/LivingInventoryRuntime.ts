/**
 * Salsabil OS — Phase 1 · Wave 3
 * Layer 4 (Domain) · Living Inventory Runtime.
 *
 * Sovereign source of truth for *availability* questions in the running
 * UI. Holds an in-memory projection of the supply layer of every known
 * `CommerceEntity`, and exposes a deterministic `canFulfill` predicate
 * + reservation primitives.
 *
 * Hard rules:
 *   1. NO inventory math is allowed in the UI — UIs only call
 *      `canFulfill` and read `getAvailable`.
 *   2. The runtime is pure data — no React, no Supabase, no fetch.
 *   3. Vertical-agnostic: it speaks Product DNA, never product names.
 */
import type { CommerceEntity } from "@/core/commerce/entity/CommerceEntity";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryView {
  readonly productId: string;
  readonly available: number;
  readonly lowStockThreshold: number;
  readonly status: InventoryStatus;
}

export type InventorySnapshot = ReadonlyMap<string, InventoryView>;
export type InventoryListener = (snapshot: InventorySnapshot) => void;

interface InventoryCell {
  stock_qty: number;
  reserved: number;
  low_stock_threshold: number;
}

const computeView = (productId: string, cell: InventoryCell): InventoryView => {
  const available = Math.max(0, cell.stock_qty - cell.reserved);
  const status: InventoryStatus =
    available <= 0
      ? "out_of_stock"
      : available <= cell.low_stock_threshold
        ? "low_stock"
        : "in_stock";
  return {
    productId,
    available,
    lowStockThreshold: cell.low_stock_threshold,
    status,
  };
};

export class LivingInventoryRuntime {
  private cells = new Map<string, InventoryCell>();
  private snapshot: InventorySnapshot = new Map();
  private readonly listeners = new Set<InventoryListener>();

  /** Replace the projection with the supply layer of `entities`. */
  hydrate(entities: ReadonlyArray<CommerceEntity>): void {
    const next = new Map<string, InventoryCell>();
    for (const e of entities) {
      const supply = e.context.supply;
      const previous = this.cells.get(e.entity_id);
      next.set(e.entity_id, {
        stock_qty: Math.max(0, Math.floor(supply.stock_qty)),
        reserved: previous?.reserved ?? 0,
        low_stock_threshold: Math.max(0, Math.floor(supply.low_stock_threshold)),
      });
    }
    this.cells = next;
    this.recompute();
  }

  /** Pure availability check — never mutates. */
  canFulfill(productId: string, requestedQty: number): boolean {
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) return false;
    const cell = this.cells.get(productId);
    if (!cell) return false;
    return cell.stock_qty - cell.reserved >= Math.floor(requestedQty);
  }

  getAvailable(productId: string): number {
    const v = this.snapshot.get(productId);
    return v?.available ?? 0;
  }

  getView(productId: string): InventoryView | null {
    return this.snapshot.get(productId) ?? null;
  }

  getSnapshot(): InventorySnapshot {
    return this.snapshot;
  }

  /** Hold `qty` units against `productId`; returns whether it succeeded. */
  reserve(productId: string, qty: number): boolean {
    if (!this.canFulfill(productId, qty)) return false;
    const cell = this.cells.get(productId);
    if (!cell) return false;
    cell.reserved += Math.floor(qty);
    this.recompute();
    return true;
  }

  release(productId: string, qty: number): void {
    const cell = this.cells.get(productId);
    if (!cell) return;
    cell.reserved = Math.max(0, cell.reserved - Math.floor(qty));
    this.recompute();
  }

  subscribe(listener: InventoryListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private recompute(): void {
    const next = new Map<string, InventoryView>();
    for (const [id, cell] of this.cells) next.set(id, computeView(id, cell));
    this.snapshot = next;
    for (const l of this.listeners) l(this.snapshot);
  }
}

/** Process-singleton consumed by POS, KDS, and Storefront UIs. */
export const livingInventoryRuntime = new LivingInventoryRuntime();
