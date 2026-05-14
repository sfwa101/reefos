/**
 * Salsabil OS — Phase 1 · Wave 3
 * Layer 4 (Domain) · CommerceEntity & ProductDNA enforcement.
 *
 * `CommerceEntity` is the canonical envelope every commercial product
 * surface (POS, Storefront, KDS, Catalog admin) consumes. It is a
 * narrowed specialization of {@link CivilizationEntity} bound to the
 * five-layer {@link ProductDNA} payload.
 *
 * No runtime dependencies — pure types and a single deterministic
 * adapter from the legacy {@link ProductCardVM} projection.
 */
import type {
  EntityCapabilityBinding,
  EntityEvent,
  EntityLifecycleState,
  EntityMemoryCell,
  EntityPolicy,
  EntityRelationship,
  I18nText,
  ISODateString,
  ProductBehavioralDNA,
  ProductDNA,
  ProductFinancialDNA,
  ProductIdentityDNA,
  ProductIntelligenceDNA,
  ProductSupplyDNA,
  UUID,
} from "@/core/commerce/knowledge/dna.types";
import type { ProductCardVM, I18nText as VMI18nText } from "@/core/catalog/types";

export type {
  ProductDNA,
  ProductIdentityDNA,
  ProductFinancialDNA,
  ProductBehavioralDNA,
  ProductSupplyDNA,
  ProductIntelligenceDNA,
} from "@/core/commerce/knowledge/dna.types";

/**
 * Constitutional commerce envelope. Structurally a
 * {@link CivilizationEntity} bound to {@link ProductDNA}, declared
 * directly to keep the `context` field strictly typed (the generic
 * variant collapses to `JsonObject`).
 */
export interface CommerceEntity {
  readonly entity_id: UUID;
  readonly entity_type: "product";
  readonly state: EntityLifecycleState;
  readonly context: ProductDNA;
  readonly relationships: ReadonlyArray<EntityRelationship>;
  readonly capabilities: ReadonlyArray<EntityCapabilityBinding>;
  readonly memory: ReadonlyArray<EntityMemoryCell>;
  readonly events: ReadonlyArray<EntityEvent>;
  readonly policies: ReadonlyArray<EntityPolicy>;
  readonly created_at: ISODateString;
  readonly updated_at: ISODateString;
}

const STOCK_IN = 99;
const STOCK_LOW = 3;

const toI18n = (t: VMI18nText | undefined): I18nText | undefined => {
  if (!t) return undefined;
  const out: I18nText = { ar: t.ar };
  if (t.en !== undefined) out.en = t.en;
  return out;
};

/**
 * Project a `ProductCardVM` into a strict `CommerceEntity`.
 * Pure, deterministic, side-effect free.
 */
export function commerceEntityFromCard(card: ProductCardVM): CommerceEntity {
  const name = toI18n(card.name);
  const identity: ProductIdentityDNA = {
    id: card.id,
    slug: card.slug,
    sku: card.sku ?? null,
    name: name ?? { ar: card.slug },
    short_description: toI18n(card.shortDescription),
    section_id: card.sectionId || null,
    tags: [...card.tags],
    badges: card.badges.map((b) => b.key),
    is_active: true,
    is_featured: false,
  };

  const financial: ProductFinancialDNA = {
    currency: card.price.currency,
    base_price: card.price.amount,
    compare_at_price: card.price.compareAt ?? null,
  };

  const behavioral: ProductBehavioralDNA = {
    popularity_score: 0,
    rating_avg: card.rating.avg,
    rating_count: card.rating.count,
  };

  const stock_qty = !card.inStock ? 0 : card.isLowStock ? STOCK_LOW : STOCK_IN;
  const supply: ProductSupplyDNA = {
    sale_unit: card.saleUnit,
    stock_qty,
    low_stock_threshold: STOCK_LOW,
    is_perishable: false,
  };

  const intelligence: ProductIntelligenceDNA = {
    attributes: card.attributes as ProductIntelligenceDNA["attributes"],
  };

  const now = new Date().toISOString();
  return {
    entity_id: card.id,
    entity_type: "product",
    state: "active",
    context: { identity, financial, behavioral, supply, intelligence },
    relationships: [],
    capabilities: [],
    memory: [],
    events: [],
    policies: [],
    created_at: now,
    updated_at: now,
  };
}
