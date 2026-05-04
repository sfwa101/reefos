/**
 * Logistics Engine — Domain Contracts
 * ----------------------------------------------------------------
 * Pure type definitions for the Advanced Address & Delivery Engine.
 * These types are the SOLE bridge between:
 *   - DB rows (geo_zones, delivery_methods, addresses)
 *   - UI components (AddressSheet, MethodPicker, CartSummary)
 *   - PricingEngine (consumes LogisticsQuote inside PricingContext)
 *
 * STEM-CELL RULE: this module imports from NOTHING in /pages, /components
 * or /context. Adapters live in `src/core/logistics/adapters/*`.
 */

/* ===================================================================
 * 1. Delivery Zone — backed by `public.geo_zones`
 *    (We reuse the existing rich table instead of duplicating it.)
 * =================================================================== */
export interface DeliveryZone {
  id: string;
  zoneCode: string;            // 'A' | 'B' | 'C' | 'D' | 'M' | 'E' | …
  name: string;
  shortName: string;
  districts: ReadonlyArray<string>;
  baseFee: number;             // = geo_zones.delivery_fee
  minOrderValue: number;       // = geo_zones.min_order_total
  freeDeliveryThreshold: number | null;
  baseEtaMinutes: number;      // = geo_zones.base_eta_minutes ?? eta_minutes
  etaLabel: string;
  codAllowed: boolean;
  acceptsPerishables: boolean;
  /** GeoJSON polygon — currently unused, reserved for map drawing. */
  polygon: unknown | null;
  /** Live ops metric (1.0 = normal, >1 = surge). */
  currentLoadFactor: number;
  surgeActive: boolean;
  isActive: boolean;
}

/* ===================================================================
 * 2. Delivery Method — backed by `public.delivery_methods`
 * =================================================================== */
export type DeliveryMethodCode = "standard" | "vip" | "scheduled";

export interface DeliveryMethod {
  id: string;
  code: DeliveryMethodCode | string;
  nameAr: string;
  nameEn: string;
  /** Multiplied against zone.baseFee. VIP = 1.5, scheduled = 0.9 … */
  feeMultiplier: number;
  /** Flat surcharge added AFTER multiplication (e.g. VIP +15 EGP). */
  flatSurcharge: number;
  /** Method's own ETA contribution (overrides zone ETA when set & > 0). */
  baseEtaMins: number;
  etaLabelAr: string;
  requiresScheduling: boolean;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

/* ===================================================================
 * 3. Address — backed by `public.addresses` (extended in Phase 12.1)
 * =================================================================== */
export type BuildingType = "apartment" | "villa" | "office" | "other";

export interface Address {
  id: string;
  userId: string;
  label: string;
  // Geo + zone link
  city: string;
  district: string | null;
  street: string | null;
  building: string | null;
  buildingType: BuildingType | null;
  floor: string | null;
  apartmentNo: string | null;
  lat: number | null;
  lng: number | null;
  zoneId: string | null;
  // Recipient
  recipientName: string | null;
  recipientPhone: string | null;
  // Misc
  notes: string | null;
  deliveryInstructions: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ===================================================================
 * 4. LogisticsQuote — the contract injected into PricingContext
 *    PricingEngine consumes this; it never touches DB or UI directly.
 * =================================================================== */
export interface LogisticsQuote {
  zone: DeliveryZone;
  method: DeliveryMethod;
  /** Subtotal at quote time (used for free-delivery threshold check). */
  subtotal: number;
  /** Final delivery fee after multiplier, surcharge, surge & free threshold. */
  deliveryFee: number;
  /** True if zone.freeDeliveryThreshold met (fee forced to 0). */
  freeDeliveryApplied: boolean;
  /** True if surge is currently active for this zone. */
  surgeApplied: boolean;
  /** Effective ETA in minutes after surge factor. */
  etaMinutes: number;
  etaLabel: string;
  /** Soft block: e.g. perishables disallowed in remote zone. */
  warnings: ReadonlyArray<LogisticsWarning>;
  /** Hard block: order can NOT proceed (min_order_value not met, etc). */
  blockers: ReadonlyArray<LogisticsBlocker>;
}

export type LogisticsWarning =
  | { code: "perishables_in_remote_zone"; message: string }
  | { code: "scheduled_required"; message: string }
  | { code: "surge_active"; message: string };

export type LogisticsBlocker =
  | { code: "below_min_order"; message: string; shortfall: number }
  | { code: "zone_inactive"; message: string }
  | { code: "method_not_available_in_zone"; message: string };

/* ===================================================================
 * 5. Pure pricing inputs — what `computeLogisticsQuote` needs.
 *    No React, no Supabase, no globals — fully unit-testable.
 * =================================================================== */
export interface QuoteInput {
  zone: DeliveryZone;
  method: DeliveryMethod;
  subtotal: number;
  /** Optional: cart contains perishables (meat/dairy/produce). */
  hasPerishables?: boolean;
}

/* ===================================================================
 * 6. PricingEngine bridge — extension of PricingContext.
 *    Imported by PricingEngine via a dedicated adapter only.
 * =================================================================== */
export interface PricingLogisticsContext {
  logistics?: LogisticsQuote;
}
