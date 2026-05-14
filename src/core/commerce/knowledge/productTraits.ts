/**
 * Lifestyle / handling trait extractor for the legacy `Product` shape.
 *
 * Hakim's Vision Cortex emits `traits` as an array of strings (e.g.
 * ["keto", "high_protein", "halal_certified"]). The minted `salsabil_assets.traits`
 * jsonb is then folded into `Product.metadata` by `assetToProduct`. Depending on
 * which mint path produced the row, traits may live as:
 *   - `metadata.handling_traits` (array)
 *   - `metadata.tags` (array)
 *   - numeric-indexed siblings on `metadata` (when traits was spread as array)
 *   - `metadata.traits` (array or object)
 *
 * This helper normalizes all of those shapes to a deduped string array of
 * lifestyle-relevant traits, with reserved/structural keys filtered out.
 */

const RESERVED = new Set([
  "brand", "old_price", "rating", "badge", "perishable", "category", "unit",
  "usa_asset_id", "usa_sku_id", "wakalah_eligible", "hide_on_zero",
  "low_stock_threshold", "aliases", "barcode", "fulfillment_type",
  "aesthetic_palette", "aesthetic_image_data_url",
]);

const LIFESTYLE_LABELS: Record<string, string> = {
  keto: "كيتو",
  high_protein: "بروتين عالي",
  protein: "بروتين",
  vegan: "نباتي",
  vegetarian: "نباتي",
  gluten_free: "خالي جلوتين",
  sugar_free: "خالي سكر",
  organic: "عضوي",
  halal_certified: "حلال",
  halal: "حلال",
  cold_chain: "تبريد",
  fragile: "هش",
  fresh: "طازج",
  diabetic_friendly: "صديق للسكري",
};

function pushAll(out: Set<string>, value: unknown): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) if (typeof v === "string" && v.trim()) out.add(v.trim());
    return;
  }
  if (typeof value === "string") {
    out.add(value.trim());
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === true && !RESERVED.has(k)) out.add(k);
    }
  }
}

export function extractHandlingTraits(metadata: unknown): readonly string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const m = metadata as Record<string, unknown>;
  const out = new Set<string>();
  pushAll(out, m.handling_traits);
  pushAll(out, m.traits);
  pushAll(out, m.tags);
  // Numeric-indexed leftovers from a spread array.
  for (const [k, v] of Object.entries(m)) {
    if (/^\d+$/.test(k) && typeof v === "string" && v.trim()) out.add(v.trim());
  }
  return Array.from(out).filter((t) => !RESERVED.has(t));
}

export function traitLabel(trait: string): string {
  const norm = trait.toLowerCase().replace(/\s+/g, "_");
  return LIFESTYLE_LABELS[norm] ?? trait.replace(/_/g, " ");
}
