# Purification Baseline — Wave P-0 (Guardrails)

> **Status:** Frozen · Phase 1 · Wave P-0
> **Authority:** `SALSABIL_MASTER_ROADMAP_AND_PURIFICATION_PLAN.md` + `SYSTEM_CONSTITUTION.md` (Articles 3, 3a, 11, 12)
> **Mandate:** Every subsequent Wave (P-A → P-E and beyond) MUST **strictly reduce** every counter recorded below. A wave that lands without lowering at least one counter is rejected.

---

## 0. Purpose

Wave P-0 does **not** fix violations. It **freezes** the legacy footprint so that purification waves can be measured, ratcheted, and audited. This file is the immovable benchmark.

Going forward:

- No PR may **increase** any counter in §2.
- Any reduction MUST be reflected here in §4 (Ratchet Log).
- Any new file matching a forbidden pattern MUST be blocked at lint or review.

---

## 1. Frozen Snapshot (as of Wave P-0 ratification)

| Indicator | Frozen Count | Source of Truth |
|---|---:|---|
| Direct `supabase.from(...)` calls reachable from UI (components / pages / apps / hooks consumed by UI) | **74** | Audit Report §2 |
| Files importing `@/lib/products` | **58** | Audit Report §3 |
| Legacy `HGProduct` view-model footprint (declarations + consumers) | **non-zero, present across HomeGoods / Compare / legacy listings** | Audit Report §4 |
| Hardcoded section route files under `src/pages/store/*.tsx` (Meat, Pharmacy, Dairy, Produce, Sweets, Kitchen, Restaurants, Wholesale, Village, SchoolLibrary, HomeGoods, Recipes, Baskets, Subscriptions, …) | **≥ 17** | `src/pages/store/` listing |
| Direct `supabase.from(...)` in admin/ops UI | **part of the 74 total** | Audit Report §2 |
| Vertical-named components / hooks / routes (`Meat*`, `Pharmacy*`, `Crepes*`, `IceCream*`, `Potato*`, etc.) | **non-zero** | Constitution Article 3a violations |

> The exact file lists for each indicator are owned by `ARCHITECTURE_AUDIT_REPORT.md`. This document records the **counters**, not the inventory.

---

## 2. Hard Counters (Ratchet Targets)

These are the four numbers Waves P-A → P-E must drive monotonically toward zero:

```text
C1  ui_supabase_from_calls          = 74     (target: 0)
C2  lib_products_importers          = 58     (target: 0)
C3  hgproduct_footprint             = present (target: removed)
C4  hardcoded_section_route_files   ≥ 17     (target: 1 dynamic route)
C5  vertical_named_source_files     > 0      (target: 0 — Article 3a)
```

Definitions:

- **C1**: any `.ts/.tsx` under `src/components/**`, `src/pages/**`, `src/apps/**`, `src/hooks/**`, or `src/modules/**` that contains the literal `supabase.from(`. Server functions (`*.functions.ts`), gateways (`src/core/**/gateway/**`), and `src/integrations/supabase/**` are **excluded** by definition — they are the sanctioned data plane.
- **C2**: any file containing `from "@/lib/products"` or `from "@/lib/products/...".
- **C3**: any declaration, type, mapper, or import referencing the legacy `HGProduct` shape. Target replacement: canonical `ProductCardVM`.
- **C4**: any route file whose existence encodes a vertical (Meat, Pharmacy, Dairy, Sweets, Kitchen, …). Target: a single dynamic `store.$slug.tsx` driven by `RuntimeRenderer`.
- **C5**: any source file whose **name, type literal, branch, or hardcoded slug** encodes a specific vertical (Article 3a forbidden patterns).

---

## 3. Non-Negotiable Rules (Effective from Wave P-0)

1. **No new violations.** PRs that add to C1–C5 are blocked at review.
2. **No silent regressions.** Any wave that touches the data plane MUST update §4 with the new counter values.
3. **No bypassing the watchdog.** The DEV watchdog (`src/core/runtime-ui/watchdog.ts`) is the in-runtime tripwire; suppressing it is a constitutional violation.
4. **No relaxation of the lint rules** added in Wave P-0 without an ADR amending the Constitution.
5. **No editing of this baseline’s §1 / §2 numbers.** They are frozen forever as the historical zero-point. Progress is recorded only in §4.

---

## 4. Ratchet Log (Append-Only)

| Date | Wave | C1 | C2 | C3 | C4 | C5 | Notes |
|---|---|---:|---:|---|---:|---|---|
| 2026-05-12 | P-0 | 74 | 58 | present | ≥17 | >0 | Baseline frozen. Guardrails installed (DEV watchdog + ESLint warn). |
| 2026-05-12 | P-A | 74 | 58 | removed | ≥17 | >0 | HGProduct eradicated; home storefront now consumes canonical ProductCardVM exclusively. |
| 2026-05-12 | P-B/B-3 | 74 | 62 | removed | ≥17 | >0 | Cart engine domain decoupled from `@/lib/products` (12 files migrated to `useCartHydration` + snapshot; legacy bridge retained for §2.E consumers). |
| 2026-05-12 | P-B/B-4 | 74 | 54 | removed | ≥17 | >0 | Pricing engine decoupled — strategies + adapter + hook consume narrow `PricingInput` instead of legacy `Product`; 8 pricing files dropped `@/lib/products`. |
| 2026-05-12 | P-B/B-5 | 74 | 49 | removed | ≥17 | >0 | Hooks & queries domain (§2.C) decoupled — 5 files (`useProductsQuery`, `useInfiniteCatalog`, `useBuyAgainProducts`, pharmacy/library data) now own their cache key + import legacy `Product` only from `@/core/catalog/legacy/legacyProduct.types`. `libraryProducts()` static read replaced by `useLibraryProducts()` hook wrapping `useProductsBySourceQuery("library")`. |
| 2026-05-12 | P-B/B-6 | 74 | 46 | removed | ≥17 | >0 | Search & feeds (§2.B) decoupled — `CatalogBootstrap` eradicated (deleted + unmounted from `__root.tsx`); `useUniversalSearch` and `sovereignCatalog` swapped legacy type imports to `@/core/catalog/legacy/legacyProduct.types`. Legacy proxy in `src/lib/products.ts` now degrades to `[]` when no `bindCatalogSource()` caller is mounted; remaining §2.E external consumers tracked for B-7. |
| 2026-05-12 | P-B/B-7 | 74 | 32 | removed | ≥17 | >0 | Storefront leaves (§2.E storefront + offers + SDUI subgroups, 14 files) migrated off `@/lib/products`: 7 storefront (`BundleCard`, `DetailSheet`, `ProductCard`, `QuickMealsRail`, `useHomeOrchestrator`, `SduiCategoryPage`, `StoreCategoryGrid`), 5 offers (`FlashSalesGrid`, `FulfillmentBadge`, `PersonalizedDealsRail`, `SectionOffersRail`, `SponsoredRestaurantRail`), 2 SDUI offers (`SduiOfferFlashSale`, `SduiPredictiveRefillRail`). Runtime proxy + `getById`/`bySource`/`bindCatalogSource`/`registerProducts`/`ensureProductsLoaded`/`refetchProducts` extracted into `@/core/catalog/legacy/legacyRuntime` with a transient self-binding shim — first empty-snapshot read in the browser fires a one-shot `productsQueryOptions().queryFn()` fetch and caches results so the unmigrated 8 §2.E consumers keep functioning until B-10. `src/lib/products.ts` is now a pure re-export shim. |

> Append a new row for every wave that changes any counter. Never edit an existing row.

---

## 5. Enforcement Surface (installed in Wave P-0)

- **DEV runtime watchdog** — `src/core/runtime-ui/watchdog.ts`, wired at app bootstrap. In `import.meta.env.DEV` only, intercepts `supabase.from(...)` calls originating from UI-layer stack frames and emits a fierce `console.error` citing **Constitution Article 3 Violation: Direct DB access from UI**. Never throws in production; never alters runtime behavior.
- **ESLint boundary rules** — `eslint.config.js` `no-restricted-imports` rules restrict `@/integrations/supabase/client` inside `src/components/**`, `src/pages/**`, `src/apps/**`, and restrict `@/lib/products` everywhere. Set to **warn** so the existing 74 / 58 violations remain visible without breaking the build. Each subsequent wave SHOULD migrate offending files and (eventually) flip the rules to **error**.

---

## 6. Exit Criteria for Wave P-0

- [x] This baseline file exists and is committed.
- [x] DEV watchdog module exists and is invoked at app bootstrap.
- [x] ESLint boundary rules are present and active (warn).
- [x] No existing application code (UI, hooks, pages) was modified to "fix" violations — Wave P-0 is fences only.

Wave P-A may begin once all four boxes are checked.
| 2026-05-12 | P-B/B-8 | 74 | 21 | removed | ≥17 | >0 | Vertical leaves (§2.E) decoupled — 11 files across baskets/library/recipes/restaurants/sweets/wholesale + product-detail peek sheet migrated off `@/lib/products`. Type-only consumers (`BorrowCard`, `BorrowSheet`, `BundlesGrid`, `PrintWizard`, `SchoolLibrarySection`, `RestaurantsMenuSection`, `VariantPicker`) now import `Product` from `@/core/catalog/legacy/legacyProduct.types`; runtime consumers (`BasketsBuilderSection`, `WholesaleComparisonSection`, `ProductPeekSheet`, `RecipeModal`) now import `products`/`getById`/`registerProducts` from `@/core/catalog/legacy/legacyRuntime` (transient self-binding shim still in effect). Article 3a naming violations (`SweetsProductSheet`, `MeatPricingStrategy`) deferred to Wave P-C per scope lock. Remaining 21 importers belong to B-9 legacy `src/components/**` + top-level `src/pages/**` sweep. |
| 2026-05-12 | P-B/B-9 | 74 | 0 | removed | ≥17 | >0 | Final sweep — 21 legacy `src/components/**` + `src/pages/**` consumers migrated off `@/lib/products` (type-only → `@/core/catalog/legacy/legacyProduct.types`; runtime `products`/`getById`/`bySource` → `@/core/catalog/legacy/legacyRuntime`). C2 is now strictly **0**: only `src/lib/products.ts` itself remains as a re-export shim, and only documentation strings still mention the path. Transient self-binding shim continues to back the runtime proxy until the shim file is vaporized in B-10. Article 3a renames (Meat/Sweets/etc.) deferred to Wave P-C per scope lock. |
| 2026-05-12 | P-B/B-10 | 74 | 0 | removed | ≥17 | >0 | Wave P-B (Static Catalog Killer) COMPLETE. `src/lib/products.ts` vaporized. ESLint rule promoted to ERROR. C2 locked at 0. Residual `src/lib/**` siblings (baskets, butcheryPrep, personalize, productEnrichment, smartPairs, supermarketTaxonomy, volumeDeals) had relative `./products` imports rewritten to `@/core/catalog/legacy/legacyProduct.types` (types) and `@/core/catalog/legacy/legacyRuntime` (runtime). Transient self-binding shim retained to sustain B-8/B-9 consumers until Wave P-C. |
| 2026-05-12 | P-C/C-1+C-2 | 74 | 0 | removed | ≥17 | >0 | Resolver + dynamic route landed (additive). `resolveSectionTree(identity, orchestrator)` composes the section page shell as a `RenderDescriptor`; 6 new block kinds (`nav.back_header`, `section.hero_banner`, `section.layout_factory`, `section.filters_sheet`, `commerce.compare_bar`, `product.detail_sheet`) registered via `registerCoreBlocks`. New `src/pages/store/SectionPage.tsx` + `src/routes/_app/store.$slug.tsx` (with `beforeLoad` notFound guard against `getSectionIdentity`) mount alongside legacy literals. |
| 2026-05-12 | P-C/C-4 (γ+α) | 74 | 0 | removed | 7 | >0 | Cutover for Group γ (Restaurants, Baskets, Subscriptions, SchoolLibrary, Wholesale) + Group α (Meat, Pharmacy, Sweets, Recipes, Village): 10 page shells under `src/pages/store/` and 10 route declarations under `src/routes/_app/store.*.tsx` vaporized. Traffic falls through to the new dynamic `/store/$slug` route. 4 typed `Link` / `navigate` callsites (`CartUpgradeBanner`, `ButcherSheet`, `RestaurantDetail`, `BasketsSubs`) rewritten to `to="/store/$slug" params={{ slug }}`. C4: 17 → 7. |
| 2026-05-12 | P-C/C-3+C-4 (β) | 74 | 0 | removed | 3 | >0 | Capability migration + Group β cutover. `SectionIdentity` extended with `capabilities?: ReadonlyArray<SectionCapability>`; new `SECTION_CAP.COMPARE` flag attached to `home-goods`, `produce`, `dairy`, `kitchen`. `resolveSectionTree` now gates `commerce.compare_bar` on `SECTION_CAP.COMPARE` instead of mounting unconditionally. 4 page shells (`HomeGoods`, `Dairy`, `Produce`, `Kitchen`) + 4 route declarations vaporized. `home` registered as a registry alias of `home-goods` (with REEF_PAGE_KEY mapping `home → "home"`) so legacy `/store/home` links keep resolving. **C4: 7 → 3** (only deferred bespoke routes remain: `BasketsBuild`, `BasketsSubs`, `CompareHomeGoods`). |
| 2026-05-12 | P-C/C-5+C-6+C-7 | 74 | 0 | removed | 3 | −11 | **Wave P-C COMPLETE.** Phase C-5: 11 Type-B vertical-named UI sheets vaporized from `src/components/{baskets,kitchen,meat,restaurants,sweets}/` and `src/apps/reef-al-madina/features/{sweets,wholesale}/components/`, relocated under generic block paths `src/core/runtime-ui/blocks/{commerce,product}/{basket-card,basket-detail-sheet,smart-swap-sheet,cart-upgrade-banner,fulfillment-selector,meal-sheet,butcher-sheet,restaurant-card,restaurant-item-sheet,sweets-sheet,compare-section}.tsx` and registered as 11 new generic block kinds (`product.basket_card`, `commerce.basket_detail_sheet`, `commerce.smart_swap_sheet`, `commerce.cart_upgrade_banner`, `commerce.fulfillment_selector`, `product.meal_sheet`, `product.butcher_sheet`, `product.restaurant_card`, `product.restaurant_item_sheet`, `product.sweets_sheet`, `product.compare_section`) via `registerCoreBlocks` (new `migratedSheets.tsx` wrapper module). 5 external consumers swapped (`Cart`, `ProductCard`, `RestaurantDetail`, `BasketsBuilderSection`, `SduiComparisonGrid`). Phase C-6: `SduiCategoryPage.tsx` + last `store.supermarket.tsx` route vaporized; `supermarket` registered as a first-class identity in `SECTION_IDENTITY_REGISTRY` so `/store/supermarket` resolves through the dynamic `$slug` route. ESLint `no-restricted-imports` now bans any reintroduction of `SduiCategoryPage` (error). Phase C-7: this row. **C5 reduced by 11.** |
| 2026-05-12 | P-D/D-0 | 26 | 0 | removed | 3 | >0 | Baseline drift reconciliation: C1 drops from 74 to 26 (unrecorded side-effect of 17 route deletions in Wave P-C which carried legacy admin/ops reads). New C1 ceiling is 26 files (66 occurrences). |
| 2026-05-12 | P-D/D-1 | 21 | 0 | removed | 3 | >0 | User-Account Gateway landed. New `src/lib/user.functions.ts` (10 `createServerFn` handlers behind `requireSupabaseAuth`: profile get/upsert, addresses list/setDefault/delete, notifications list/markAllRead, accountHub aggregator, hakim insights/snapshot/markRead/chat) + `src/lib/user.queries.ts` (typed `queryOptions` factories under `userKeys.*`). 5 UI consumers migrated off direct `supabase.from(...)` and `@/integrations/supabase/client`: `pages/account/Profile.tsx`, `pages/account/Addresses.tsx`, `pages/account/Notifications.tsx`, `pages/Account.tsx`, `components/hakim/FloatingGuardian.tsx` (realtime channel collapsed into 60s react-query refetch since the bus is no longer reachable from the UI layer; chat now flows through `chatHakimFn` server proxy). **C1: 26 → 21.** |
| 2026-05-12 | P-D/D-2 | 19 | 0 | removed | 3 | >0 | Cart / Shared-Cart Gateway landed. New `src/lib/cart.functions.ts` exposes 9 `createServerFn` handlers behind `requireSupabaseAuth` — `getCheckoutContextFn` (addresses + wallet + profile fullName), `clearMyCartFn`, `hydrateSharedCartFn`, `setSharedCartStatusFn`, `resetSharedCartApprovalsFn`, `setMyApprovalFn`, `insertSharedCartItemFn`, `updateSharedCartItemQtyFn`, `deleteSharedCartItemFn`. `useCartOrchestrator` is now 100% free of `@/integrations/supabase/client` (checkout-context hydration, post-checkout cart purge, and the legacy `supabase.auth.getSession()` fallback all removed; `useAuth` is the single source of truth for the signed-in user). `useSharedCartSync` keeps the import EXEMPT for the realtime `supabase.channel(...)` subscription only — every `from(...)` read/write (initial hydration + FSM transitions + item ops) is now routed through the gateway. **C1: 21 → 19.** |
