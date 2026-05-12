# PRODUCT CORE — Reconnaissance Report

**Scope:** Read-only architectural scan in preparation for Constitution v2.0
Phase 1 (Product DNA + Universal Entity Engine / `CivilizationEntity`).
**Date:** 2026-05-12  •  **Mode:** Read-only. No code, schema, or data was modified.

---

## 1. Database — Current State

### 1.1 Primary product table
There is **no `public.products` table**. The active sovereign product store is:

| Table | Rows | Purpose |
|---|---|---|
| `public.usa_products` | **207** | Canonical Reef Al-Madina product store (Sovereign Catalog) |

**Schema highlights of `usa_products`** (monolithic — all product concerns in one row):

- Identity: `id`, `slug`, `sku`, `section_id`
- i18n content: `name_i18n`, `short_description_i18n`, `description_i18n`, `story_i18n`, `storage_conditions_i18n` (all `jsonb`)
- Pricing: `base_price`, `compare_at_price`, `wholesale_price`, `member_price`, `tax_class`, `currency`
- Inventory: `sale_unit`, `stock_qty`, `low_stock_threshold`
- Lifecycle: `is_perishable`, `shelf_life_days`, `seasonal_window`
- Discovery: `badges text[]`, `tags text[]`, `attributes jsonb`, `popularity_score`, `rating_avg`, `rating_count`
- State: `is_active`, `is_featured`, `created_at`, `updated_at`, `deleted_at`

### 1.2 Product satellite tables (already normalized, healthy)
`product_addons`, `product_batches`, `product_bundles`, `product_media`,
`product_nutrition`, `product_partners`, `product_relations`,
`product_requests`, `product_units`, `product_variants`,
`product_variants_v2`, `flash_sale_products`.

### 1.3 Universal Entity Engine — partial scaffold already present
| Table | Rows | Notes |
|---|---|---|
| `entity_definitions` | **24** | key, label_i18n, **`table_name`**, `primary_key_col`, `is_system`, RLS-locked to admin |
| `entity_attributes`  | (n/a) | EAV-style per-entity attribute spec: `data_type`, `ui_widget`, `validation_jsonb`, `options_jsonb`, role visibility |

> ✅ This is the **embryo of `CivilizationEntity`** (Article 5.1). It already supports:
> - Pointing a logical entity at a physical table via `table_name` (perfect bridge for `usa_products`).
> - Per-attribute validation, UI widget hints, role-based visibility, searchable/filterable flags.
>
> ❌ It does **not yet** carry the v2.0 ProductDNA-specific contracts:
> - No `dna_layer` / `dna_kind` discriminator
> - No declarative capability bindings (cashier, vision, inventory brain hooks)
> - No event-emitter manifest per entity
> - No “Civilization” lineage / parent-entity inheritance

There is **no `salsabil_entities` table** yet. The `entity_definitions` /
`entity_attributes` pair is the closest existing surface and is the natural
host for v2.0 metadata.

---

## 2. Codebase — Current State

### 2.1 Type surface
- **`src/core/catalog/types.ts`** — view-model layer (`ProductCardVM`,
  `ProductDetailsVM`, `ProductListVM`, `ProductVariantVM`, `ProductAddonVM`,
  `ProductNutritionVM`, `ProductRelationVM`). This is the public ViewModel
  contract consumed by the storefront.
- **`src/core/catalog/legacy/legacyProduct.types.ts`** — legacy `Product` type
  kept for the old runtime; flagged as legacy.
- **`src/modules/search/types.ts`** — search-side product shape.
- Component-local product types: `ProductCard.tsx`, `ProductCarousel.tsx`,
  `ProductPeekSheet.tsx`, `PurchaseInvoiceBuilder.tsx`, admin `Partners.tsx`.

> ✅ Single canonical VM (`ProductCardVM`/`ProductDetailsVM`) — clean facade.
> ❌ No `ProductDNA` interface and no `CivilizationEntity` interface exist anywhere
> in `src/`. (Confirmed by `rg "CivilizationEntity|ProductDNA|salsabil_entit"` → 0 hits.)

### 2.2 Data fetching surface (where `usa_products` is touched)
Exactly **two** files — already consolidated through the gateway:

| File | Lines | Role |
|---|---|---|
| `src/core/catalog/service/catalog.functions.ts` | 56, 114, 179, 224, 311 | All server-fn reads/writes (Article 5 compliant) |
| `src/core/catalog/hooks/useSectionSubcategories.ts` | 34 | Section sub-category aggregation |

> ✅ The blast radius of any product migration is **two files**. There is no
> raw `supabase.from('usa_products')` scattered across components.

---

## 3. Gap Analysis vs. Constitution v2.0

| v2.0 Requirement | Current State | Gap |
|---|---|---|
| **Article 5.1** — `CivilizationEntity` registry (universal, declarative) | `entity_definitions` exists, missing DNA fields | Extend, do not replace |
| **Article 12.1** — `ProductDNA` (layered: identity / commerce / inventory / vision / story) | Monolithic `usa_products` row | Project layers as views/derived shapes; persist new metadata in satellite + entity_attributes |
| Layer-4 Domain isolation | `catalog.functions.ts` already isolates DB; VM layer in `types.ts` | ✅ Already compliant |
| `salsabil_entities` table | Does not exist | Either (a) rename/extend `entity_definitions` or (b) introduce `salsabil_entities` as a thin DNA superset that **references** `entity_definitions.id` |
| Event manifest per entity (Cashier / Vision / Inventory brains) | Absent | New `entity_capabilities` join table (proposal) |
| Cross-entity lineage (`parent_entity_id`) | Absent | Single column add on registry |

---

## 4. Migration Strategy — Bridge Without Breaking

**Guiding principle:** *"Wrap, don't replace."* `usa_products` stays as the
physical store; ProductDNA becomes a **typed projection** + a **registry
entry**, not a new table that duplicates 207 rows.

### 4.1 Recommended Phase-1 Sequence (proposed, not yet executed)

1. **DNA Registry Extension (additive SQL only)**
   - `ALTER TABLE entity_definitions ADD COLUMN dna_kind text` (e.g. `'product'`, `'order'`, `'human'`).
   - `ALTER TABLE entity_definitions ADD COLUMN parent_entity_id uuid REFERENCES entity_definitions(id)`.
   - `ALTER TABLE entity_definitions ADD COLUMN capabilities jsonb NOT NULL DEFAULT '{}'::jsonb` (cashier/vision/inventory hooks).
   - Insert a row: `key='product'`, `table_name='usa_products'`, `dna_kind='product'`.

2. **TypeScript DNA Surface (new files, no edits to existing types)**
   - `src/core/dna/types.ts` → `CivilizationEntity`, `ProductDNA`, `DNALayer` enums.
   - `src/core/dna/projectors/projectProductDNA.ts` → pure function `(usa_products row) → ProductDNA`.
   - Existing `ProductCardVM` becomes the **Layer-5 Presentation** view of the
     `ProductDNA.commerce + identity` layers — zero breakage.

3. **Gateway Bridge**
   - Extend `catalog.functions.ts` with one new server-fn `getProductDNAFn(id)`
     that returns the full layered DNA. Existing `listProductsFn`, etc.,
     stay untouched.

4. **Storefront stays on the legacy facade** during Phase 1.
   The Visual Builder and Inspector keep consuming `ProductCardVM`. ProductDNA
   is opt-in for the Vision Cortex / Cashier Brain / Inventory Brain consumers.

### 4.2 Risk register

| Risk | Mitigation |
|---|---|
| Renaming `usa_products` would break `catalog.functions.ts` + `useSectionSubcategories.ts` | **Do not rename.** Use `entity_definitions.table_name` as the indirection. |
| Adding RLS to a new `salsabil_entities` table can mis-fire | Reuse already-vetted RLS on `entity_definitions`. |
| Type drift between `Product` (legacy), `ProductCardVM`, and `ProductDNA` | Make `ProductCardVM` a derived type (`Pick<ProductDNA['commerce' \| 'identity'], …>`). |

---

## 5. Verdict

- **Database surface area:** 1 monolithic table (`usa_products`, 207 rows) +
  12 satellite tables + 1 already-existing entity registry (`entity_definitions`,
  24 rows). No `products`, no `salsabil_entities`.
- **Code surface area:** 2 files touch `usa_products` directly. 0 files
  reference `ProductDNA` or `CivilizationEntity`.
- **Constitutional alignment:** ~40% of the Universal Entity Engine is already
  scaffolded via `entity_definitions` + `entity_attributes`. Phase 1 is an
  **additive extension**, not a rebuild.
- **Breakage risk for Phase 1 if we follow §4.1:** **Zero.** All changes are
  new tables/columns/files; existing reads continue to flow through the
  unchanged `catalog.functions.ts` facade.

---

**Recon complete. Ready to discuss the Phase-1 migration strategy.**
