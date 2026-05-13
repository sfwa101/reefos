# STEM CELL MORPH CANCER — MRI Report
**Status:** Read-only reconnaissance · Article 5.1 / 15.1 deviation map
**Date:** 2026-05-13
**Scope:** `/store/$slug` runtime, `useUiLayout` fallback chain, `LayoutFactory` registry, DB `ui_layouts` seeds.

---

## 1. Diagnosis (Executive Summary)

Every storefront vertical (Produce, Dairy, Meat, Sweets, Pharmacy, Village,
Recipes, Kitchen, Wholesale, Home Goods, Ice-Cream, Crepes-Fries, …) is
rendering the **same generic Home-Appliances layout**:

```
SearchAndFilters → CategoriesGrid → BundlesRail → BestSellersRail → ProductsGrid
```

This is **not** a UI bug. It is **deterministic data uniformity**:

* The DB has `ui_layouts` seeds for **8 `category_*` page-keys**, all with
  the **identical** `section_order`.
* Verticals without a row (`category_home-goods`, `category_ice-cream`,
  `category_crepes-fries`, alias `home`, `supermarket`) silently fall back
  to a hard-coded `DEFAULT_HOME_ORDER` in the client — which happens to be
  the **same generic shell**.
* The Stem-Cell Renderer (`resolveSectionTree`) does **not** consult
  `identity.capabilities` when picking blocks for the page body. It simply
  hands the slug to `LayoutFactory(pageKey)` and the factory serves the
  same skeleton for every key it doesn't recognize.

Net effect: **Capability-driven morphing is dead on the storefront body.**
Identity drives only chrome (hero + back header), not content layout.

---

## 2. Cancer Cells (file → line → why)

### A. `src/apps/reef-al-madina/features/storefront/home/hooks/useUiLayout.ts`
| Lines | Issue |
|------|-------|
| 16-23 | `DEFAULT_HOME_ORDER` is a hard-coded generic shell (`HeroBanner + Search + CategoriesGrid + BundlesRail + BestSellersRail + ProductsGrid`). Used as the **terminal fallback** for every unknown `pageKey`. |
| 45-49 | `DEFAULT_CATEGORY_ORDER` is the **same skeleton minus hero**. Hits every `category_*` slug. |
| 73-86 | `fallbackOrderFor()` is a slug `if/else` ladder — pure Article 15.1 violation. The "Stem Cell" knows nothing about capabilities; it switches on string identity then falls back to a global default. |
| 137-149 | When the DB row is missing, the synthesized layout has empty `section_config` and the generic order — **no awareness of `SectionIdentity.capabilities` or `layoutVariant`**. |

### B. `src/apps/reef-al-madina/features/storefront/home/components/LayoutFactory.tsx`
| Lines | Issue |
|------|-------|
| 76-163 | `REGISTRY` is a flat `SectionKey → renderer` map. No capability gating. The same renderer fires regardless of the section's DNA (a Pharmacy page calls `BundlesRail` if the DB says so, even though pharmacy products have no bundle metadata). |
| 190-205 | "Fallback hero" branch is dead code — `useUiLayout` always synthesizes a non-empty layout, so this never renders. The real fallback is the generic skeleton above. |

### C. `src/core/runtime-ui/ResolveRenderTree.ts`
| Lines | Issue |
|------|-------|
| 26-34, 36-38 | `REEF_PAGE_KEY` whitelists γ-group verticals (`reef_*`); everything else is mapped to `category_<slug>`. So **Home-Goods → `home`** (correct alias), but `Ice-Cream → category_ice-cream`, `Crepes-Fries → category_crepes-fries` — **neither row exists in DB**, so both fall back to `DEFAULT_HOME_ORDER`. |
| 156-167 | `resolveSectionTree` always emits `section.layout_factory` for non-bespoke variants. **Capabilities are never used to select blocks** — they only gate the optional `commerce.compare_bar`. |

### D. DB state — `ui_layouts` table (live snapshot)
```
category_dairy, category_kitchen, category_meat, category_pharmacy,
category_produce, category_recipes, category_sweets, category_village
  → ALL have section_order:
    [SearchAndFilters, CategoriesGrid, BundlesRail, BestSellersRail, ProductsGrid]

MISSING rows: category_home-goods, category_ice-cream, category_crepes-fries,
              category_supermarket, home
```
This is the **root genetic defect**: the seed migration cloned one shell across
every vertical instead of expressing each one's DNA.

### E. Legacy hardcoded pages
* `rg "RestaurantPage|GroceryPage|HomeGoodsPage" src/` → **0 hits.**
  Article 5.1 is **not** violated by lingering page shells. The morphology
  collapse is purely runtime/seed, not legacy file pollution. Good news.

---

## 3. Constitutional Verdict

| Article | Status | Note |
|---------|--------|------|
| **5.1 — Everything is an entity** | ✅ Honoured at file level (no hardcoded vertical pages remain). |
| **15.1 — Stem Cell Architecture** | ❌ **Severely violated.** The "stem cell" is a `pageKey` switch with a single global skeleton. Capabilities and `SectionIdentity` carry no morphogenic signal beyond the hero banner. |

Stem-cell promise: *one renderer reads identity + capabilities → emits a unique
layout DNA per vertical.*
Reality: *one renderer reads pageKey → emits the same shell for everyone.*

---

## 4. Surgical Plan — Phase SC-1 (proposed, not yet executed)

### SC-1.1 — Capability-Driven Block Resolver
* Extend `resolveSectionTree` so the **block list** itself is derived from
  `identity.capabilities` + `identity.layoutVariant`, not from a single
  `section.layout_factory` block.
* Introduce `BLOCK_RECIPES: Record<LayoutVariant, BlockKind[]>` that maps
  `standard | meal-menu | restaurant-list | …` to a curated chain of blocks
  (e.g. `produce` → `[hero, fresh_today_rail, harvest_grid]`,
  `pharmacy` → `[hero, prescription_uploader, drug_grid, consultation_cta]`).
* Layer capabilities on top: `CAP.COMPARE → +compare_bar`,
  `CAP.SUBSCRIPTION → +subscribe_cta`, `CAP.NUTRITION → +diet_filters`, …

### SC-1.2 — Kill the Generic Fallback
* Replace `DEFAULT_HOME_ORDER` / `DEFAULT_CATEGORY_ORDER` with a
  **per-variant** fallback table keyed by `layoutVariant`, not by `pageKey`
  string matching.
* When `useUiLayout` finds no DB row, synthesize from the variant recipe
  instead of returning the generic skeleton.

### SC-1.3 — DB Seed Re-Genesis
* Migration: drop the cloned `category_*` rows and reseed each vertical with
  a `section_order` that mirrors its variant recipe.
* Add the missing rows: `category_home-goods`, `category_ice-cream`,
  `category_crepes-fries`, `category_supermarket`, `home`.
* Long-term: deprecate `section_order` JSON in favour of
  `(page_key, capability_set)` resolved server-side.

### SC-1.4 — Runtime Diagnostics
* `RuntimeRenderer` already logs missing blocks in DEV; add a parallel
  warning when `LayoutFactory` falls back to `DEFAULT_HOME_ORDER` so future
  cancer is caught at first paint.

### SC-1.5 — Vertical-Specific Block Library
* New blocks under `src/core/runtime-ui/blocks/verticals/`:
  `produce.harvest_grid`, `pharmacy.prescription_uploader`,
  `wholesale.bulk_calculator`, `village.farmer_story`, …
* Each block reads only what its capabilities promise — no orchestrator
  god-object dependency.

---

## 5. Halt Point

This report is read-only. No application code, migrations, or DB rows were
modified. Awaiting the Emperor's go-signal to execute **Phase SC-1**.
