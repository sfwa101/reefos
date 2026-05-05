/**
 * Product Capabilities — polymorphic interaction contract.
 * --------------------------------------------------------
 * Read from `product.metadata.capabilities`. Drives which adapter
 * (Standard / Weight / MixBuilder) is mounted inside SmartProductSheet.
 *
 * Stored as JSON in the DB; never trust the shape blindly. The parser
 * narrows to a discriminated union and falls back to `standard`.
 */

export type CapabilityType = "standard" | "weight_based" | "mix_and_match";

export interface StandardCapability {
  readonly type: "standard";
}

export interface WeightCapability {
  readonly type: "weight_based";
  /** Optional manual ISO timestamp; absence keeps the badge logic
   *  driven by `batch_received_at` if present in metadata. */
  readonly grams_step?: number;
  readonly preset_grams?: ReadonlyArray<number>;
}

export interface MixItem {
  readonly id: string;
  readonly name: string;
  /** Optional emoji glyph for the picker chip. */
  readonly emoji?: string;
}

export interface MixCapability {
  readonly type: "mix_and_match";
  readonly mix_items: ReadonlyArray<MixItem | string>;
  /** Total target weight in grams (default 1000g). */
  readonly target_grams?: number;
}

export type ProductCapability =
  | StandardCapability
  | WeightCapability
  | MixCapability;

/** Bulk pricing tier — `buy N → save SAR×%` style discount. */
export interface BulkTier {
  readonly min_qty: number;
  readonly discount_pct: number;
}

/** Reads capabilities + bulk pricing + freshness off product metadata. */
export interface ProductIntelligence {
  readonly capability: ProductCapability;
  readonly bulkTiers: ReadonlyArray<BulkTier>;
  readonly batchReceivedAt: Date | null;
  readonly costPrice: number | null;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

function parseMixItems(raw: unknown): ReadonlyArray<MixItem | string> {
  if (!Array.isArray(raw)) return [];
  const out: (MixItem | string)[] = [];
  for (const it of raw) {
    if (typeof it === "string") out.push(it);
    else if (isObj(it) && typeof it.id === "string" && typeof it.name === "string") {
      out.push({
        id: it.id,
        name: it.name,
        emoji: typeof it.emoji === "string" ? it.emoji : undefined,
      });
    }
  }
  return out;
}

function parseCapability(raw: unknown): ProductCapability {
  if (!isObj(raw)) return { type: "standard" };
  const t = raw.type;
  if (t === "weight_based") {
    return {
      type: "weight_based",
      grams_step: typeof raw.grams_step === "number" ? raw.grams_step : undefined,
      preset_grams: Array.isArray(raw.preset_grams)
        ? (raw.preset_grams.filter((n) => typeof n === "number") as number[])
        : undefined,
    };
  }
  if (t === "mix_and_match") {
    return {
      type: "mix_and_match",
      mix_items: parseMixItems(raw.mix_items),
      target_grams: typeof raw.target_grams === "number" ? raw.target_grams : 1000,
    };
  }
  return { type: "standard" };
}

function parseBulkTiers(raw: unknown): ReadonlyArray<BulkTier> {
  if (!Array.isArray(raw)) return [];
  const out: BulkTier[] = [];
  for (const t of raw) {
    if (
      isObj(t) &&
      typeof t.min_qty === "number" &&
      typeof t.discount_pct === "number"
    ) {
      out.push({ min_qty: t.min_qty, discount_pct: t.discount_pct });
    }
  }
  return out.sort((a, b) => a.min_qty - b.min_qty);
}

export function readProductIntelligence(
  metadata: Record<string, unknown> | undefined,
): ProductIntelligence {
  const meta = metadata ?? {};
  const batchRaw = meta.batch_received_at;
  let batch: Date | null = null;
  if (typeof batchRaw === "string") {
    const d = new Date(batchRaw);
    if (!Number.isNaN(d.getTime())) batch = d;
  }
  const cost = typeof meta.cost_price === "number" ? meta.cost_price : null;

  return {
    capability: parseCapability(meta.capabilities),
    bulkTiers: parseBulkTiers(meta.bulk_pricing),
    batchReceivedAt: batch,
    costPrice: cost,
  };
}

/** Fresh if received less than 24h ago. */
export function isFreshToday(batch: Date | null): boolean {
  if (!batch) return false;
  return Date.now() - batch.getTime() < 24 * 60 * 60 * 1000;
}
