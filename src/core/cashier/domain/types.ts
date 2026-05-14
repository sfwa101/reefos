/**
 * Salsabil OS — Constitution v2.0 · Article 12.1
 * Layer 4 (Domain) · Cashier Brain — pure types.
 *
 * Zero runtime dependencies. Re-uses `ProductFinancialDNA` from the
 * canonical DNA module so the Cashier Brain reads the SAME financial
 * genome the rest of the system writes.
 */

import type { ProductFinancialDNA, UUID } from "@/core/commerce/knowledge/dna.types";

export type { ProductFinancialDNA } from "@/core/commerce/knowledge/dna.types";

// ────────────────────────────────────────────────────────────────────────────
// Inputs
// ────────────────────────────────────────────────────────────────────────────

/** Customer loyalty tier — drives generic discount rules. */
export type MemberTier = "guest" | "bronze" | "silver" | "gold" | "vip";

/** A single selected modifier on a cart line (variant delta, addon, …). */
export interface CartLineModifier {
  id: string;
  label?: string;
  /** Absolute amount in `currency`, applied per-unit. */
  unit_price_delta: number;
}

/** Authoritative input for one cart line — identity + DNA + intent. */
export interface CartLineInput {
  /** Stable line id (uuid) — matches client cart line key. */
  id: UUID;
  /** Frozen financial genome at calculation time. */
  dna: ProductFinancialDNA;
  qty: number;
  modifiers?: CartLineModifier[];
}

/** Cross-cutting calculation context (customer, geo, promo, …). */
export interface CashierContext {
  member_tier: MemberTier;
  coupon_code?: string | null;
  delivery_zone_id?: string | null;
  /** Pre-quoted delivery fee (already produced by Logistics Engine). */
  delivery_fee?: number;
  /** Optional currency override; defaults to first line's DNA currency. */
  currency?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Outputs
// ────────────────────────────────────────────────────────────────────────────

export interface CartLineSnapshot {
  id: UUID;
  qty: number;
  unit_price: number;
  line_subtotal: number;
  line_discount: number;
  line_tax: number;
  line_total: number;
}

export interface CartTotals {
  subtotal: number;
  total_discount: number;
  total_tax: number;
  delivery_fee: number;
  grand_total: number;
}

export interface CartSnapshot {
  items: CartLineSnapshot[];
  totals: CartTotals;
  currency: string;
  /** Deterministic fingerprint — same input ⇒ same hash. */
  snapshot_hash: string;
}
