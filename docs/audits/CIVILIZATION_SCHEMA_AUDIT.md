# CIVILIZATION RUNTIME SCHEMA AUDIT — Phase D-0

**Mode:** Read-only. No migrations executed.
**Scope:** Map current commerce DB to "Living Commerce Entity Engine" requirements.

---

## 1. Current Entity State

### 1.1 The Sovereign Stack (`salsabil_*`) — Already JSON-Capability-Ready ✅

The Universal Salsabil Asset (USA) layer was introduced in `20260507_salsabil_universal_engine.sql` and **already follows the polymorphic / capability-driven model**. It is NOT a flat products table.

#### `salsabil_assets` (12 rows)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| description | text | |
| category_path | text | flat string e.g. `"super/dairy"` — **not graph-ready** |
| asset_type | enum `salsabil_asset_type` | `physical \| digital \| service \| rental \| milestone_project` |
| **traits** | **jsonb** | **dynamic capability flags** — `{requires_shipping, requires_calendar, cold_chain, …}` |
| media | jsonb[] | gallery |
| is_active | bool | |
| semantic_embedding | vector | added later (semantic search) |
| created_by, created_at, updated_at, deleted_at | | soft-delete present |

#### `salsabil_skus` (16 rows) — exact unit of sale
- `asset_id → salsabil_assets`
- `sku_code` UNIQUE, `barcode` UNIQUE
- `attributes jsonb` — `{color, size}` OR `{duration_days}` OR `{floor, unit}`
- **No `parent_sku_id`** → no hierarchy support. SKUs are flat siblings under an asset.

#### `salsabil_financial_contracts` (16 rows) — pricing primitive
- `sku_id → salsabil_skus`
- `pricing_model` enum: `flat | tiered_wholesale | subscription | deposit_and_rental | milestone_installments`
- `base_price`, `currency`, `contract_rules jsonb`, `valid_from/to`
- Contracts attach to SKU, not to a unit-of-sale tier → **cannot price-override per packaging level** today.

#### `salsabil_inventory_matrix`
- `sku_id`, `inventory_type` (`count | time_slots | capacity`), `availability_data jsonb`, `location_code`
- Stock counted in SKU's implicit unit. No conversion-aware inventory.

### 1.2 The Legacy Stack — Traditional Flat Tables (Still Live)

| table | rows | shape | role |
|---|---|---|---|
| `categories` | 8 | classic `parent_id` adjacency tree + `node_type` (DEPARTMENT) | single-tree taxonomy |
| `product_units` | 42 | `product_id text` (legacy), `unit_code`, `conversion_factor int`, `selling_price`, `is_default_buy/sell` | **closest existing analog** to the requested Unit Hierarchy — but flat, integer factors only, ties to text product_id |
| `product_variants` | — | flat `label / price_delta / stock` keyed by text `product_id` | legacy flat variants |
| `product_variants_v2` | 309 | `product_id uuid`, `axis_key + axis_value`, `price_delta`, `stock numeric`, `image_url` | EAV-style variants — flat, no hierarchy |
| `units_of_measure` | 10 | global UOM dictionary (`code`, `name_ar/en`, `is_base`) | reusable UOM catalog ✅ |
| `usa_products` | — | legacy USA bridge view/table | likely deprecated |

**Verdict:** USA layer is JSON-capability-ready in spirit, but neither stack supports a recursive packaging tree. The legacy `product_units` is the only place with `conversion_factor`, and it's keyed to the legacy text `product_id` namespace, not `salsabil_skus.id`.

---

## 2. Readiness for the Unit Hierarchy Engine ("Economic Packaging Runtime")

**Target:** `Pallet → Carton → Bucket(5KG) → Kilogram → Gram`, each with own barcode, conversion multiplier, optional price override, optional stock.

### Current Gap Matrix

| Requirement | Today | Gap |
|---|---|---|
| Recursive parent/child packaging tree | ❌ none | Need `parent_id` self-FK on a packaging-tier table |
| Per-tier barcode | ✅ on `salsabil_skus.barcode` (one only) | Need many barcodes per asset (one per tier) |
| Conversion multiplier (decimal, not int) | ⚠️ `product_units.conversion_factor` is `integer` only | Need `numeric(18,6)` for `1 kg = 1000 g`, `1 piece = 0.250 kg` |
| Per-tier price override | ❌ contracts attach to SKU, not tier | Either attach contracts to tier rows or add `price_override numeric` |
| Per-tier stock & "implicit" rollup | ❌ inventory only at SKU | Need `is_stock_keeping` flag — only one tier holds physical count, others derive |
| Default buy / default sell tier | ⚠️ `product_units.is_default_buy/sell` exists for legacy | Replicate on new tier table |
| Reference to global UOM dictionary | ⚠️ `units_of_measure` exists but unwired to USA | Add `uom_code → units_of_measure.code` FK |

### Precise Migration Steps for Phase D-1 (proposed, NOT executed)

1. **New table `salsabil_packaging_tiers`**
   ```
   id uuid PK
   asset_id uuid FK → salsabil_assets(id) ON DELETE CASCADE
   parent_tier_id uuid FK → salsabil_packaging_tiers(id) NULL  -- recursive
   tier_label text NOT NULL                                    -- "Pallet" / "Carton" / "kg"
   uom_code text FK → units_of_measure(code)
   conversion_to_parent numeric(18,6) NOT NULL                 -- e.g. 12 cartons in pallet
   conversion_to_base    numeric(18,6) NOT NULL                -- denormalized: tier → base unit
   barcode text UNIQUE
   price_override numeric(14,2) NULL                           -- overrides contract calc
   is_stock_keeping boolean DEFAULT false                      -- only one TRUE per tree
   is_default_sell  boolean DEFAULT false
   is_default_buy   boolean DEFAULT false
   sort_order int DEFAULT 0
   attributes jsonb DEFAULT '{}'                               -- per-tier capability flags
   created_at, updated_at
   ```
2. **Validation trigger** (CHECKs can't be deferred): single root per asset, exactly one `is_stock_keeping=true` per asset tree, `conversion_to_parent > 0`, no cycles (recursive CTE check).
3. **Inventory pivot** — change `salsabil_inventory_matrix` to optionally key on `packaging_tier_id` instead of/in addition to `sku_id`. Backfill: each existing SKU → 1 leaf tier with `conversion_to_base = 1`.
4. **Contracts pivot** — add nullable `packaging_tier_id` on `salsabil_financial_contracts`; pricing engine resolves tier-first then falls back to SKU.
5. **Backfill plan** — port `product_units` rows (42) into the new tier table, mapping legacy `product_id text` → matched `salsabil_assets.id` where possible. Mark unmapped rows as orphan for manual review.
6. **Capability flag** — add `'packaging_hierarchy'` to `capability_registry` and stamp on assets that opt in (so UI/runtime know to render tier picker).
7. **RLS** mirror: public read on active rows + admin write via `has_role(uid,'admin')` (same pattern as the existing USA tables).

---

## 3. Readiness for Multi-Dimensional Classification (Tag Graph)

### Today
- **`categories`** is a classic single-parent tree (`parent_id` adjacency, `node_type='DEPARTMENT'`). One asset → one path via `salsabil_assets.category_path` (text string). **Strictly mono-dimensional.**
- No tag table. No many-to-many membership table.
- `salsabil_assets.traits` jsonb can hold ad-hoc flags but is unindexed for cross-asset facet queries (well — there is a GIN index on `traits`, but it's per-asset, not designed as a shared tag vocabulary).

### Gap to Graph/Tag System
An asset must simultaneously belong to **Dairy**, **Ramadan Offers**, **Fast Moving** — three orthogonal axes.

### Precise Migration Steps (proposed for Phase D-1/D-2)

1. **`asset_tags` (vocabulary)**
   ```
   id uuid PK
   tag_key text NOT NULL          -- "department" | "campaign" | "velocity" | "diet" | …
   tag_value text NOT NULL        -- "dairy" | "ramadan_2026" | "fast_moving"
   label_i18n jsonb                -- {ar, en}
   parent_tag_id uuid NULL FK self -- optional sub-tags within an axis
   metadata jsonb
   UNIQUE(tag_key, tag_value)
   ```
2. **`asset_tag_links` (graph membership)**
   ```
   asset_id uuid FK → salsabil_assets(id) ON DELETE CASCADE
   tag_id   uuid FK → asset_tags(id)       ON DELETE CASCADE
   weight   numeric DEFAULT 1               -- ranking signal
   assigned_by uuid, assigned_at timestamptz
   PRIMARY KEY (asset_id, tag_id)
   ```
   GIN-style indexes on `tag_id` and `asset_id` for both directions.
3. **Migration of `categories` + `category_path`**
   - Each `categories` row → `asset_tags` row with `tag_key='department'`.
   - Walk every `salsabil_assets.category_path` → emit one `asset_tag_links` row per segment.
   - Keep `categories` and `category_path` for one release as a read-compat shim, then drop.
4. **Capability** — register `'multi_classification'` in `capability_registry`; `SectionRegistry` and `searchSovereignAssets` must learn to filter by `tag_key:tag_value` predicates instead of `category_path LIKE`.
5. **RLS** — public read on tags + links; admin write.

---

## 4. Summary Verdict

| Pillar | Status | Action for D-1 |
|---|---|---|
| Polymorphic asset entity | ✅ already in place (`salsabil_assets` + traits jsonb) | none |
| Pricing model variety | ✅ enum + jsonb rules already covers 5 models | extend to honor packaging tier |
| Packaging hierarchy / Unit tree | ❌ flat SKUs, integer-only legacy `product_units` | **Build `salsabil_packaging_tiers` (Step 1–7 §2)** |
| Multi-dimensional classification | ❌ single tree only | **Build `asset_tags` + `asset_tag_links` (Step 1–5 §3)** |
| Inventory awareness of conversions | ❌ SKU-flat | Pivot inventory key to tier_id |
| Capability registry wiring | ✅ exists | Register `packaging_hierarchy`, `multi_classification` |
| Legacy debt | ⚠️ `product_units` (42), `product_variants_v2` (309) still live | Backfill + deprecation plan after D-1 |

**Phase D-1 is unblocked.** The USA foundation is structurally healthy; we add two new tables (`salsabil_packaging_tiers`, `asset_tags` + `asset_tag_links`) and two pivot columns (`packaging_tier_id` on inventory + contracts). No destructive change to `salsabil_assets` itself.
