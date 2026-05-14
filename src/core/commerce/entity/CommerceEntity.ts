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
  CivilizationEntity,
  ProductBehavioralDNA,
  ProductDNA,
  ProductFinancialDNA,
  ProductIdentityDNA,
  ProductIntelligenceDNA,
  ProductSupplyDNA,
} from "@/core/commerce/knowledge/dna.types";
import type { ProductCardVM } from "@/core/catalog/types";

export type {
  ProductDNA,
  ProductIdentityDNA,
  ProductFinancialDNA,
  ProductBehavioralDNA,
  ProductSupplyDNA,
  ProductIntelligenceDNA,
} from "@/core/commerce/knowledge/dna.types";

/** Constitutional commerce envelope. */
export type CommerceEntity = CivilizationEntity<ProductDNA> & {
  readonly entity_type: "product";
};

const STOCK_IN = 99;
const STOCK_LOW = 3;

/**
 * Project a `ProductCardVM` into a strict `CommerceEntity`.
 * Pure, deterministic, side-effect free.
 */
export function commerceEntityFromCard(card: ProductCardVM): CommerceEntity {
  const identity: ProductIdentityDNA = {
    id: card.id,
    slug: card.slug,
    sku: card.sku ?? null,
    name: card.name,
    short_description: card.shortDescription,
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
