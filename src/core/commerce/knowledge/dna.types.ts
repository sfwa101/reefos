/**
 * Salsabil OS — Constitution v2.0
 * Layer 4 (Domain) · Civilization Entity DNA core types.
 *
 * These types are *additive*. They do not replace `ProductCardVM`,
 * `ProductDetailsVM`, or any legacy `Product` shape. They describe the
 * canonical, capability-aware identity of an entity inside the Universal
 * Entity Engine — the "DNA" that downstream brains (Cashier, Vision,
 * Inventory, Hakim) read from.
 *
 * No runtime imports. Pure structural contracts.
 */

// ────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────────────────────────────────────

export type UUID = string;
export type ISODateString = string;
export type I18nText = Record<string, string>; // { ar: "...", en: "..." }
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** Discriminator for any registered Civilization Entity. */
export type DnaKind =
  | "product"
  | "order"
  | "human"
  | "place"
  | "vehicle"
  | "document"
  | "event"
  | (string & {}); // open-ended for forward compatibility

/** Lifecycle state of any entity. */
export type EntityLifecycleState =
  | "draft"
  | "active"
  | "paused"
  | "archived"
  | "deleted";

// ────────────────────────────────────────────────────────────────────────────
// Article 5.1 — CivilizationEntity (universal envelope)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Declarative binding from an entity to a capability handler (e.g. a
 * server function, a brain, an event consumer). The shape is intentionally
 * loose — it is interpreted by the capability runtime.
 */
export interface EntityCapabilityBinding {
  /** Stable capability key, e.g. "cashier.price", "vision.detect". */
  capability: string;
  /** Optional handler reference — server-fn name, edge fn slug, etc. */
  handler?: string;
  /** Static config passed to the handler at invocation time. */
  config?: JsonObject;
  /** Whether this binding is currently active. */
  enabled?: boolean;
}

/** Declarative relationship to another entity (lineage, ownership, etc.). */
export interface EntityRelationship {
  /** e.g. "parent", "owner", "belongs_to", "supplied_by". */
  kind: string;
  /** Target entity DNA kind (helps routing without a DB lookup). */
  targetKind: DnaKind;
  /** Target entity primary key. */
  targetId: UUID;
  /** Free-form metadata for the relationship. */
  meta?: JsonObject;
}

/** A meaningful event emitted by an entity (audit + brain training trail). */
export interface EntityEvent {
  id: UUID;
  type: string;
  occurredAt: ISODateString;
  actor?: { kind: DnaKind; id: UUID } | null;
  payload?: JsonObject;
}

/** Long-lived memory cells attached to an entity (vector ids, summaries…). */
export interface EntityMemoryCell {
  key: string;
  value: JsonValue;
  updatedAt: ISODateString;
  source?: string;
}

/** Policy gate (RBAC, geo, time, capability quota…). */
export interface EntityPolicy {
  key: string;
  rule: JsonObject;
  enforcedBy?: "db" | "server" | "client";
}

/**
 * Article 5.1 — The universal envelope every Civilization Entity wears.
 * Concrete entity shapes (e.g. `ProductDNA`) plug into `context`.
 */
export interface CivilizationEntity<TContext extends JsonObject = JsonObject> {
  entity_id: UUID;
  entity_type: DnaKind;
  state: EntityLifecycleState;
  /** Domain-specific payload — for products this is `ProductDNA`. */
  context: TContext;
  relationships: EntityRelationship[];
  capabilities: EntityCapabilityBinding[];
  memory: EntityMemoryCell[];
  events: EntityEvent[];
  policies: EntityPolicy[];
  created_at: ISODateString;
  updated_at: ISODateString;
}

// ────────────────────────────────────────────────────────────────────────────
// Article 12.1 — ProductDNA (layered product genome)
// ────────────────────────────────────────────────────────────────────────────

/** Layer 1 — who this product *is*. */
export interface ProductIdentityDNA {
  id: UUID;
  slug: string;
  sku?: string | null;
  name: I18nText;
  short_description?: I18nText;
  description?: I18nText;
  story?: I18nText;
  section_id?: UUID | null;
  tags: string[];
  badges: string[];
  is_active: boolean;
  is_featured: boolean;
}

/** Layer 2 — how this product is *priced and sold*. */
export interface ProductFinancialDNA {
  currency: string;
  base_price: number;
  compare_at_price?: number | null;
  wholesale_price?: number | null;
  member_price?: number | null;
  tax_class?: string | null;
  /** Declarative pricing modifiers (offers, member tiers, geo). */
  pricing_rules?: JsonObject;
}

/** Layer 3 — how this product *behaves* with humans (engagement signals). */
export interface ProductBehavioralDNA {
  popularity_score: number;
  rating_avg: number;
  rating_count: number;
  /** Free-form behavioral signals (CTR, dwell, conversion…). */
  signals?: JsonObject;
}

/** Layer 4 — how this product *flows* through inventory and supply. */
export interface ProductSupplyDNA {
  sale_unit: string;
  stock_qty: number;
  low_stock_threshold: number;
  is_perishable: boolean;
  shelf_life_days?: number | null;
  storage_conditions?: I18nText;
  seasonal_window?: JsonObject | null;
  /** Per-warehouse / per-batch refinements (filled by projector). */
  locations?: JsonObject;
}

/** Layer 5 — how this product is *understood* by AI brains. */
export interface ProductIntelligenceDNA {
  /** Free-form attributes (the existing `attributes` jsonb column). */
  attributes: JsonObject;
  /** Embedding ids / vector handles produced by Vision/Hakim. */
  embeddings?: { kind: string; ref: string }[];
  /** Declarative AI capability bindings (vision, predict_basket…). */
  ai_capabilities?: EntityCapabilityBinding[];
  /** Latest inferred labels (e.g. allergens, halal status, cuisine). */
  inferred_labels?: JsonObject;
}

/**
 * Article 12.1 — Composite Product DNA. Plugs into
 * `CivilizationEntity<ProductDNA>` as the `context` payload.
 */
export interface ProductDNA {
  identity: ProductIdentityDNA;
  financial: ProductFinancialDNA;
  behavioral: ProductBehavioralDNA;
  supply: ProductSupplyDNA;
  intelligence: ProductIntelligenceDNA;
}

/** Convenience alias for a fully-wrapped product entity. */
export type ProductCivilizationEntity = CivilizationEntity<
  ProductDNA & JsonObject
>;
