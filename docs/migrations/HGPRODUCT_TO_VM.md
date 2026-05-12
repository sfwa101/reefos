# HGProduct → ProductCardVM Migration Blueprint

> **Status:** Read-only reconnaissance · Wave P-A (Storefront Purity)
> **Authority:** `SALSABIL_MASTER_ROADMAP_AND_PURIFICATION_PLAN.md` · Constitution Articles 3, 3a, 9 (Single Source of Truth)
> **Scope:** Eradicate the legacy `HGProduct` view-model and its mapper `productToHGView` from the Reef Al Madina **Home storefront** feature. Replace 100% of consumer code with the canonical `ProductCardVM` from `@/core/catalog`.
> **Constraint:** This document is reconnaissance only. **No `.ts` / `.tsx` files were modified.**

---

## 1. Infected File Inventory (exhaustive)

The legacy `HGProduct` footprint is **fully contained** inside the Reef Al Madina Home feature folder — no leaks into `src/components/`, `src/pages/`, `src/core/`, or other apps. This is a clean blast radius.

### 1.1 Type & mapper sources (delete after migration)

| # | File | Role | Lines of interest |
|---|---|---|---|
| 1 | `src/apps/reef-al-madina/features/storefront/home/types.ts` | Declares `HGProduct`, `CatId`, `Fulfillment`, `Bundle`, `SortId`, `FulfillmentFilter` | L25–L50 (`HGProduct`) |
| 2 | `src/apps/reef-al-madina/features/storefront/home/mapper.ts` | Declares `productToHGView(p: Product) → HGProduct` | L50–L79 |

### 1.2 Consumers (rewire to `ProductCardVM`)

| # | File | Usage | Critical signature |
|---|---|---|---|
| 3 | `…/home/hooks/useHomeOrchestrator.ts` | Imports `HGProduct`, calls `productToHGView` to map raw `Product[]` into the orchestrator state (`catalog`, `filtered`, `bestSellers`, `opened`). | L57, L61, L85, L88–L90, L121 |
| 4 | `…/home/components/ProductCard.tsx` | Imports `HGProduct`; defines `toCompareItem(p: HGProduct)`; props `{ p: HGProduct }`. | L27, L29, L52 |
| 5 | `…/home/components/BundleCard.tsx` | Imports `HGProduct`; props `items: HGProduct[]`. | L12, L20 |
| 6 | `…/home/components/BestSellersRail.tsx` | Imports `HGProduct`; props `items: HGProduct[]`. | L8, L17 |
| 7 | `…/home/components/ProductsGrid.tsx` | Imports `HGProduct`; props `filtered: HGProduct[]`. | L9, L24 |
| 8 | `…/home/components/BundlesRail.tsx` | Imports `HGProduct`; filters `catalog: HGProduct[]` for bundle items. | L11, L21, L37 |
| 9 | `…/home/components/DetailSheet.tsx` | Imports `HGProduct`; props `product: HGProduct`. | L30, L82 |

**Total:** 2 source files (delete) + 7 consumer files (rewire). **Zero files outside `src/apps/reef-al-madina/features/storefront/home/`.**

> Constitutional note (Article 3a): `CatId` is a hardcoded vertical literal union (`majors | small | kitchen | clean | decor`). It is **out of scope for Wave P-A** — Wave P-C (Route Collapse) will replace it with descriptor-driven categories. For Wave P-A we keep `CatId` as a transitional adapter input only.

---

## 2. Field-to-Field Mapping Table

Canonical target: `ProductCardVM` from `src/core/catalog/types.ts` (L96–L116).
Details target: `ProductDetailsVM` (L119–L131) — used only by `DetailSheet.tsx`.

Legend:
- ✅ **Direct** — 1:1 field, identical or trivially renamed.
- 🔁 **Resolver** — shape changes (e.g. scalar → `I18nText`, scalar → `PriceVM`, scalar → `MediaRefVM`).
- 🧬 **Capability-derived** — value lives in `capabilities[]` / `attributes` / `badges[]` and is computed by the existing kernel resolvers (`ProductCapabilityResolver`, `ProductHydrationPipeline`, `ProductRuntimeEngine`). Do NOT reintroduce as a top-level field.
- 🪦 **Drop** — UI-local concept that has no place in the sovereign VM; the consumer must read it from a derived selector or a section descriptor.

| `HGProduct` field | `ProductCardVM` equivalent | Kind | Notes |
|---|---|---|---|
| `id: string` | `id: string` | ✅ | Identical. |
| `name: string` | `name: I18nText` (read `name.ar` for current UI; later via locale) | 🔁 | Replace `p.name` with `t(p.name)` helper or `p.name.ar`. |
| `brand: string` | `attributes.brand: string` (fallback to `"Reef Home"` only at render time) | 🧬 | Brand is no longer a first-class field — it's a section attribute. |
| `unit: string` | `saleUnit: string` | ✅ | Trivial rename. |
| `price: number` | `price.amount: number` | 🔁 | Read via `p.price.amount`; format with currency from `p.price.currency`. |
| `oldPrice?: number` | `price.compareAt?: number` (+ `price.discountRatio`) | 🔁 | Discount % is now precomputed by the resolver — stop computing it in the card. |
| `image: string` | `hero?.url` (from `MediaRefVM`) | 🔁 | Use `hero.url`; pass `hero.alt`, `hero.blurhash` to `LazyImage`. |
| `rating: number` | `rating.avg: number` | 🔁 | Trivial. |
| `reviews: number` | `rating.count: number` | 🔁 | Trivial. |
| `category: CatId` | `sectionSlug: string` + `attributes.subcategory` | 🧬 | Filtering moves to the **feed/section adapter**, not the card. The card no longer knows about `CatId`. |
| `fulfillment: "instant" \| "preorder"` | `capabilities` includes `"fulfillment.instant"` or `"fulfillment.preorder"` | 🧬 | Branch on capability key, never on a literal. |
| `depositPct?: number` | `attributes.depositPct: number` (gated by `capabilities.includes("fulfillment.preorder")`) | 🧬 | |
| `etaDays?: number` | `attributes.etaDays: number` (same gate) | 🧬 | |
| `tagline: string` | `shortDescription?: I18nText` | 🔁 | If empty → render nothing (do not default to `""` in code). |
| `badges: string[]` | `badges: BadgeVM[]` | 🔁 | Replace string badges with `BadgeVM { key, label, tone }` — **labels MUST come from the BadgeRegistry**, not literals. |
| `warranty?: string` | `attributes.warranty: string` (gated by `capabilities.includes("warranty.has")`) | 🧬 | |
| `stock?: number` | `inStock: boolean` + `isLowStock: boolean` | 🧬 | The raw stock count is NOT exposed to the UI. Only the two derived booleans are. If the UI truly needs the number, it lives in `attributes.stockQty` and the section descriptor must opt in. |
| `wakalahEligible?: boolean` | `capabilities.includes("wakalah.eligible")` | 🧬 | |
| `hideOnZero?: boolean` | Filtered upstream in `catalogGateway` (UI never sees a hidden product) | 🪦 | Drop entirely from the UI. |
| `lowStockThreshold?: number` | Used only by the resolver to compute `isLowStock` | 🪦 | Drop from the UI. |
| `tags?: string[]` | `tags: string[]` | ✅ | Identical. |

### 2.1 Details-only additions (`DetailSheet.tsx`)

`DetailSheet` should consume `ProductDetailsVM` (extends `ProductCardVM`) so it gains:

| Need | Source |
|---|---|
| Long description | `description: I18nText` |
| Story / heritage block | `story: I18nText` |
| Storage info | `storageConditions: I18nText`, `shelfLifeDays`, `isPerishable` |
| Gallery | `gallery: MediaRefVM[]` |
| Variants & addons | `variants[]`, `addons[]` |
| Nutrition (where applicable) | `nutrition: ProductNutritionVM` |
| Recommendations | `relations: ProductRelationVM[]` |
| Seasonal availability | `seasonalWindow` |

`DetailSheet` MUST be loaded via the existing `getProductDetailsByIdFn` server function (already part of the catalog gateway), never by re-mapping the card VM.

---

## 3. Step-by-Step Refactoring Plan (Wave P-A execution prompt input)

> Each step is **atomic**, **type-checked at the boundary**, and **never breaks the running UI** — the orchestrator emits `ProductCardVM` from step 1, and consumers are flipped one at a time.

### Step 1 — Introduce a transitional adapter (additive, zero deletions)
- Add `homeProductCardAdapter(card: ProductCardVM): { catId: CatId; isPreorder: boolean; depositPct?: number; etaDays?: number; warranty?: string; brand: string }` inside the home feature.
- This adapter is the **only** place where capability keys (`"fulfillment.preorder"`, `"wakalah.eligible"`, `"warranty.has"`) and `attributes` keys are translated into the home-specific filter axes (`CatId`).
- Outcome: a single, explicit, testable bridge file. No consumers touched yet.

### Step 2 — Re-source the orchestrator from the canonical gateway
- In `useHomeOrchestrator.ts`, replace the `rawProducts.map(productToHGView)` line with a call to the existing **`useHomeProductsQuery`** (already returns `ProductCardVM[]` via `catalogGateway`).
- Update the orchestrator's internal types (`catalog`, `filtered`, `bestSellers`, `opened`) from `HGProduct[]` → `ProductCardVM[]`.
- Compute the `CatId` axis through `homeProductCardAdapter` for the filter bar **only** (the cards themselves keep getting `ProductCardVM`).
- Outcome: the orchestrator now emits `ProductCardVM`. Components still type-check because they still import `HGProduct` (next step flips them).

### Step 3 — Flip leaf components one at a time
Order chosen to minimize prop-graph churn (leaves first, rails last):

1. `ProductCard.tsx` — change `p: HGProduct` → `p: ProductCardVM`. Replace `p.name` with `p.name.ar`, `p.image` with `p.hero?.url`, `p.price` with `p.price.amount`, `p.oldPrice` with `p.price.compareAt`, `p.rating` with `p.rating.avg`, `p.reviews` with `p.rating.count`. Resolve `fulfillment`, `depositPct`, `etaDays`, `warranty`, `wakalahEligible`, `brand` via `homeProductCardAdapter(p)`. Replace `string[]` badges with `BadgeVM[]` (use `BadgeRegistry` for labels). Update `toCompareItem(p)` accordingly.
2. `BundleCard.tsx` — same prop change, no internal logic changes.
3. `BestSellersRail.tsx` — same prop change.
4. `ProductsGrid.tsx` — same prop change.
5. `BundlesRail.tsx` — same prop change; the `.filter((p): p is HGProduct => Boolean(p))` becomes `.filter((p): p is ProductCardVM => Boolean(p))`.
6. `DetailSheet.tsx` — change `product: HGProduct` → `product: ProductDetailsVM`. Switch the data source to `getProductDetailsByIdFn` (already exists in `catalogGateway`). Render the new fields described in §2.1.

After each component flip, run typecheck. The orchestrator already emits `ProductCardVM`, so each flip is a leaf-only change.

### Step 4 — Decommission the legacy types
- Delete `productToHGView` from `mapper.ts` (the file may shrink to nothing — delete the file in that case).
- Delete the `HGProduct` type from `types.ts`. Keep `Bundle`, `SortId`, `FulfillmentFilter`, `Fulfillment`, and (transitionally) `CatId`.
- Search the repo for any remaining `HGProduct` / `productToHGView` references — must be **zero**.

### Step 5 — Update the Purification Baseline
- In `docs/baselines/PURIFICATION_BASELINE.md` §4 (Ratchet Log), append a new row for Wave P-A:
  - `C3 hgproduct_footprint = removed`.
  - `C1`, `C2`, `C4`, `C5` unchanged.
- Note in the row: "HGProduct eradicated; home storefront now consumes canonical `ProductCardVM` exclusively."

### Step 6 — (Out of Wave P-A, scheduled into Wave P-C)
- The `CatId` literal union and the `CAT_TO_SUBCAT` dictionary remain in violation of Article 3a. They are **explicitly deferred** to Wave P-C (Route Collapse), which replaces hardcoded categories with descriptor-driven `SectionIdentity` rows. Do NOT attempt to fix them in Wave P-A — the scope creep would re-open the orchestrator surgery.

---

## 4. Risk & Verification Checklist

- [ ] `rg "HGProduct|productToHGView" src/` returns zero matches after Step 4.
- [ ] No file under `src/apps/reef-al-madina/features/storefront/home/` imports from `@/lib/products` for view-model purposes (it may transiently import the `Product` row type for the adapter; that import disappears with Step 2).
- [ ] Home page renders identically: same cards, same filter chips, same best-sellers rail, same bundles rail, same detail sheet (visual diff = 0).
- [ ] `useHomeOrchestrator` returns the same orchestrator surface (`catalog.length`, `filtered.length`, `bestSellers.length`) for the same input.
- [ ] No new direct `supabase.from(...)` calls were introduced (C1 must not increase).
- [ ] DEV watchdog (`installSupabaseUiWatchdog`) does not fire while navigating the home page.
- [ ] ESLint warning count for `@/lib/products` imports decreases by the number of home-feature files that previously imported it.

---

## 5. Out-of-Scope for Wave P-A (explicitly deferred)

- `CatId` and `CAT_TO_SUBCAT` — Wave P-C.
- `src/lib/products.ts` deletion — Wave P-B.
- The 17+ hardcoded section route files (`src/pages/store/*.tsx`) — Wave P-C.
- The 74 direct `supabase.from(...)` calls in admin/ops UI — Wave P-D.
- Capability-driven event spine — Wave P-E.

Wave P-A's single mandate: **delete `HGProduct`, restore the canonical VM as the only storefront contract.** Nothing more.
