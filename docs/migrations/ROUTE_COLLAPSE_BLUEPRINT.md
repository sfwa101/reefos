# Route Collapse Blueprint — Wave P-C (Runtime Route Collapse)

> **Status:** Reconnaissance · Read-Only Audit · No code mutated.
> **Authority:** `SYSTEM_CONSTITUTION.md` Articles 3 + 3a · `PURIFICATION_BASELINE.md` C4/C5 ratchets.
> **Mandate:** Drive C4 (`hardcoded_section_route_files`) from **17 → 1** and C5 (`vertical_named_source_files`) toward **0**, by collapsing every storefront vertical into a single dynamic `store.$slug.tsx` route fed by a declarative `RenderDescriptor` tree.

This document is the **migration plan**. It does **not** change any source. Implementation lands in subsequent C-x steps.

---

## 1. Inventory

### 1.1 C4 — Hardcoded Vertical Route Files (Target: collapse to 1)

#### A. Page shells (`src/pages/store/*.tsx`) — **17 files**

| # | File | LoC | Shape | Target Disposition |
|---|---|---:|---|---|
| 1 | `Meat.tsx` | 7 | `<SduiCategoryPage themeKey="meat" pageKey="category_meat" />` | DELETE — slug `meat` |
| 2 | `Pharmacy.tsx` | 7 | `<SduiCategoryPage themeKey="pharmacy" pageKey="category_pharmacy" />` | DELETE — slug `pharmacy` |
| 3 | `Sweets.tsx` | 7 | `<SduiCategoryPage themeKey="sweets" pageKey="category_sweets" />` | DELETE — slug `sweets` |
| 4 | `Recipes.tsx` | 7 | `<SduiCategoryPage themeKey="recipes" pageKey="category_recipes" />` | DELETE — slug `recipes` |
| 5 | `Village.tsx` | 7 | `<SduiCategoryPage themeKey="village" pageKey="category_village" />` | DELETE — slug `village` |
| 6 | `Dairy.tsx` | 72 | Orchestrator shell (`useHomeOrchestrator("dairy")`) + `LayoutFactory` + `CompareBar` + `DetailSheet` + `FiltersSheet` + `SectionHeroBanner` + flag fallback to `SduiCategoryPage` | DELETE — slug `dairy` |
| 7 | `Produce.tsx` | 69 | Same orchestrator shell as `Dairy.tsx` | DELETE — slug `produce` |
| 8 | `Kitchen.tsx` | 69 | Same orchestrator shell | DELETE — slug `kitchen` |
| 9 | `HomeGoods.tsx` | 69 | Same orchestrator shell, `useHomeOrchestrator()` (default `home`) | DELETE — slug `home-goods` |
| 10 | `Restaurants.tsx` | 22 | `LayoutFactory pageKey="reef_restaurants"` thin shell | DELETE — slug `restaurants` |
| 11 | `Baskets.tsx` | 17 | `LayoutFactory pageKey="reef_baskets"` thin shell | DELETE — slug `baskets` |
| 12 | `Subscriptions.tsx` | 17 | `LayoutFactory pageKey="reef_subscriptions"` thin shell | DELETE — slug `subscriptions` |
| 13 | `SchoolLibrary.tsx` | 17 | `LayoutFactory pageKey="reef_school_library"` thin shell | DELETE — slug `school-library` |
| 14 | `Wholesale.tsx` | 17 | `LayoutFactory pageKey="reef_wholesale"` thin shell | DELETE — slug `wholesale` |
| 15 | `CompareHomeGoods.tsx` | 8 | `LayoutFactory pageKey="reef_compare_home_goods"` (sub-experience of `home-goods`) | DEFER — keep as `/store/home-compare` (tooling page, not a vertical); revisit in P-D |
| 16 | `BasketsBuild.tsx` | 236 | Bespoke builder UI, `useCart`, tier math, `legacyRuntime.products` | DEFER — bespoke tool route `/store/baskets-build`; revisit in P-D |
| 17 | `BasketsSubs.tsx` | 169 | Subscription management UI, `useSubscriptions` | DEFER — bespoke tool route `/store/baskets-subs`; revisit in P-D |

**Net C4 reduction at end of Wave P-C:** 17 → **3** (one dynamic vertical route + 2 deferred bespoke tool routes). The 2 deferred files are out of P-C scope because they are workflow tools, not section catalogs; their dedicated wave (P-D Bespoke Tools) collapses them via dedicated `RuntimeRenderer` block kinds (`commerce.basket_builder`, `commerce.subscription_manager`).

#### B. Route declarations (`src/routes/_app/store.*.tsx`) — **14 files**

```
store.meat.tsx              store.recipes.tsx           store.baskets.tsx
store.pharmacy.tsx          store.restaurants.tsx       store.baskets-subs.tsx
store.sweets.tsx            store.dairy.tsx             store.baskets-build.tsx
store.village.tsx           store.produce.tsx           store.library.tsx
store.kitchen.tsx           store.wholesale.tsx
```

> Note: `store.home.tsx`, `store.subscription.tsx`, `store.supermarket.tsx`, `store.home-compare.tsx` also exist; these point at `HomeGoods`, `Subscriptions`, supermarket/home aliases, and `CompareHomeGoods` respectively. All collapse the same way except `store.home-compare.tsx` (deferred with its page).

**All 11 vertical route declarations collapse into a single file:** `src/routes/_app/store.$slug.tsx`.

### 1.2 C5 — Vertical-Named Source Files (Article 3a violations)

Inventory of vertical-named files outside `src/pages/store/` (66 hits). Buckets:

**Type A — Section feature folders (KEEP folder, RENAME if needed in P-E):**
- `src/apps/reef-al-madina/features/{baskets,library,meat,pharmacy,recipes,restaurants,subscriptions,sweets,wholesale}/**`
- These are content modules, not capability code. Folder names per Article 3a are tolerable as long as their public exports don't leak vertical literals into kernel layers. Rename deferred to **Wave P-E (Naming Sweep)**.

**Type B — Vertical-named runtime code (MUST migrate / generalize in P-C):**

| File | Verdict | Plan |
|---|---|---|
| `src/components/baskets/BasketCard.tsx` | C5 | Replaced by generic `product.basket_card` block in B-3.2 |
| `src/components/baskets/BasketSheet.tsx` | C5 | Replaced by generic `commerce.basket_detail_sheet` block |
| `src/components/baskets/SmartSwapSheet.tsx` | C5 | Becomes `commerce.smart_swap_sheet` block |
| `src/components/baskets/AnimatedNumber.tsx` | benign primitive | KEEP, move to `src/core/runtime-ui/primitives/` |
| `src/components/baskets/CartUpgradeBanner.tsx` | C5 | Becomes `commerce.cart_upgrade_banner` block |
| `src/components/kitchen/MealSheet.tsx` | C5 | Becomes `product.meal_sheet` block (variant of `product.detail_sheet` driven by `cardStyle: "meal"`) |
| `src/components/meat/ButcherSheet.tsx` | C5 | Generic `product.detail_sheet` + `product.variants` (driven by `MeatPricingStrategy` capabilities) |
| `src/components/restaurants/RestaurantBlock.tsx` | C5 | Becomes `product.restaurant_card` block |
| `src/components/restaurants/RestaurantItemSheet.tsx` | C5 | Generic `product.detail_sheet` driven by section identity |
| `src/components/sweets/SweetsProductSheet.tsx` | C5 | Generic `product.detail_sheet` + `product.variants` + `product.fulfillment_selector` |
| `src/apps/.../sweets/components/VariantPicker.tsx` | C5 (name) | Generalize → `VariantPickerBlock` (already kernel-ready, see §3.2) |
| `src/apps/.../sweets/components/FulfillmentSelector.tsx` | C5 | Generic `commerce.fulfillment_selector` block |
| `src/apps/.../meat/components/CutBuilder.tsx` + `Panel.tsx` + `PrepOptions.tsx` | C5 | Generic `product.modifier_builder` block driven by `ModifierOrchestrator` (already exists in `src/core-os/modifier-engine/`) |
| `src/apps/.../pharmacy/components/{CategoryRail,EmptyState,ProductCards,ProductOverlay,ScannerOverlay,SmartBar}.tsx` | C5 | Map to existing kernel blocks: `section.category_rail`, `section.empty_state`, `product.grid` (cardStyle=`pharmacy`), `product.detail_sheet`, `commerce.scanner_overlay`, `section.smart_bar` |
| `src/apps/.../recipes/components/{DailyBrowser,WeeklyPlanner,RecipeModal}.tsx` | C5 | New blocks: `recipes.daily_browser`, `recipes.weekly_planner`, `product.recipe_modal` (defer; dedicated P-D wave) |
| `src/apps/.../baskets/components/BasketsBuilderSection.tsx` | C5 | New block `commerce.basket_builder` (defer to P-D) |
| `src/apps/.../subscriptions/components/SubscriptionsBuilderSection.tsx` | C5 | New block `commerce.subscription_builder` (defer to P-D) |
| `src/apps/.../library/components/{BorrowCard,BorrowSheet,BundlesGrid,KYCGateDialog,PrintWizard}.tsx` | C5 | New blocks under `library.*` namespace (defer to P-D) |
| `src/apps/.../restaurants/components/RestaurantsMenuSection.tsx` | C5 | Generic `restaurant.menu_section` (cardStyle from identity); defer wholesale rename to P-E |
| `src/apps/.../sweets/components/SweetsCustomizationForm.tsx` | C5 | Driven by `ModifierOrchestrator` already; rename only — defer to P-E |
| `src/apps/.../wholesale/components/WholesaleComparisonSection.tsx` | C5 | Becomes `product.compare_section` block |
| `src/core/engine/pricing/strategies/{MeatPricingStrategy,SweetsPricingStrategy,WholesalePricingStrategy}.ts` | C5 (name only) | Strategies are **legitimate** vertical-named per Article 3a §3 (capability strategies); audit and confirm no vertical literals leak. KEEP names; document exception. |
| `src/lib/{baskets,butcheryPrep,kitchenMenu,library,restaurants,savedBaskets,sweetsFulfillment,villageMeta}.ts` | C5 | Move to `src/core/catalog/strategies/<slug>.ts`, named after capability not vertical. Defer rename to P-E. Body code stays. |
| `src/hooks/useSubscriptions.ts` | benign | KEEP — generic subscription hook, not vertical. |
| `src/apps/.../product-detail/{PharmacyMedicalBlock,VillageBlocks}.tsx` | C5 | Already block-shaped; register as `product.medical_block` and `product.village_block` keyed off section identity. Defer rename to P-E. |

**C5 Wave P-C contribution:** 11 component files migrated to generic blocks (Type B vertical-named UI sheets). Folder renames + lib renames batched in **Wave P-E**.

---

## 2. Layout Deconstruction (How Each Vertical Renders Today)

Every C4 page resolves to one of three legacy shapes:

### Shape α — Trivial `SduiCategoryPage` wrapper (5 pages)
```
Meat · Pharmacy · Sweets · Recipes · Village
```
React tree (after `SduiCategoryPage` expansion):
```
<div dir="rtl" className="space-y-4 pb-32 bg-background">
  <BackHeader title subtitle />
  <SectionHeroBanner identity />
  <LayoutFactory pageKey={`category_${slug}`} orchestrator={useHomeOrchestrator(source)} theme />
  {orchestrator.opened && <DetailSheet />}
  {orchestrator.filtersOpen && <FiltersSheet />}
</div>
```

### Shape β — Orchestrator shell with overlays (4 pages)
```
HomeGoods · Dairy · Produce · Kitchen
```
Identical to Shape α + `<CompareBar />` between `LayoutFactory` and overlays. Functionally equivalent to `SduiCategoryPage` once `CompareBar` is appended to its template.

### Shape γ — Identity + LayoutFactory only, no orchestrator (5 pages)
```
Restaurants · Baskets · Subscriptions · SchoolLibrary · Wholesale
```
React tree:
```
<div dir="rtl" className="space-y-4 pb-32 bg-background">
  <BackHeader />
  <SectionHeroBanner identity />
  <LayoutFactory pageKey={`reef_${slug}`} theme />
</div>
```
No `useHomeOrchestrator`, no overlays. Pure SDUI.

---

## 3. Target Architecture

### 3.1 Single Dynamic Route
```
src/routes/_app/store.$slug.tsx
```
```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";

export const Route = createFileRoute("/_app/store/$slug")({
  beforeLoad: ({ params }) => {
    if (!getSectionIdentity(params.slug)) throw notFound();
  },
  component: lazyStorePage(() => import("@/pages/store/SectionPage"), "list"),
});
```

### 3.2 Single Section Page Shell
```
src/pages/store/SectionPage.tsx
```
```tsx
const SectionPage = () => {
  const { slug } = Route.useParams();
  const identity = getSectionIdentity(slug)!;
  const orchestrator = useHomeOrchestrator(identityToSource(identity));
  const descriptor = resolveSectionTree(identity, orchestrator);
  return <RuntimeRenderer descriptor={descriptor} />;
};
```

### 3.3 Tree Resolver Extension

Extend `src/core/runtime-ui/ResolveRenderTree.ts` with a third resolver dedicated to section pages (currently it ships only `resolveListTree` for `ProductCardVM[]` and `resolveDetailsTree` for product detail — neither covers the page-shell composition with hero + sticky chrome + factory).

```ts
// New (additive — does not modify existing resolveListTree / resolveDetailsTree)
export function resolveSectionTree(
  identity: SectionIdentity,
  orchestrator: HomeOrchestrator,
): RenderDescriptor {
  const blocks: RenderBlock[] = [
    block("nav.back_header", "back-header", { title: identity.title, subtitle: identity.subtitle }),
    block("section.hero_banner", "hero", { identity }),
    block("section.layout_factory", "factory", {
      pageKey: identityToPageKey(identity),
      theme: storeThemes[identity.themeKey],
      orchestrator,
    }),
  ];

  if (identityHasCapability(identity, CAP.COMPARE)) {
    blocks.push(block("commerce.compare_bar", "compare"));
  }
  if (orchestrator.opened) {
    blocks.push(block("product.detail_sheet", "detail-sheet", { product: orchestrator.opened, onClose: () => orchestrator.setOpenId(null) }));
  }
  if (orchestrator.filtersOpen) {
    blocks.push(block("section.filters_sheet", "filters", { orchestrator, hue: storeThemes[identity.themeKey].hue }));
  }

  return { context: { sectionSlug: identity.slug, view: "section" }, blocks };
}
```

### 3.4 New Block Kinds Required

| Block kind | Replaces | Source file new path |
|---|---|---|
| `nav.back_header` | `<BackHeader>` direct usage | `src/core/runtime-ui/blocks/nav.tsx` |
| `section.hero_banner` | `<SectionHeroBanner identity={…} />` | `src/core/runtime-ui/blocks/section.tsx` |
| `section.layout_factory` | `<LayoutFactory pageKey theme orchestrator />` | `src/core/runtime-ui/blocks/section.tsx` |
| `section.filters_sheet` | `<FiltersSheet …/>` | `src/core/runtime-ui/blocks/section.tsx` |
| `commerce.compare_bar` | `<CompareBar/>` | `src/core/runtime-ui/blocks/commerce.tsx` |
| `product.detail_sheet` | `<DetailSheet product onClose/>` | `src/core/runtime-ui/blocks/product.tsx` |

All 6 new blocks register in `registerCoreBlocks()` (single addition).

### 3.5 Capability Mapping Helper

Section identities need a small extension so the resolver can decide whether to mount `CompareBar`/overlays without slug switches:

```ts
// src/core/sections/types.ts (additive field, not a rewrite)
capabilities?: ReadonlyArray<CapabilityKey>;
```

Today `SECTION_IDENTITY_REGISTRY` already carries `quickActions` + `layoutVariant`; adding a `capabilities` array is additive and the **only** registry mutation Wave P-C needs.

---

## 4. Phased Execution Plan (Zero Regression)

> Each step is independently shippable, leaves the build green, and only the final step deletes legacy.

### Phase C-1 — Resolver & Blocks (additive only)
- Add `resolveSectionTree()` to `ResolveRenderTree.ts`.
- Add 6 new block kinds and register them in `registerCoreBlocks()`.
- Each block component is a thin wrapper around the existing component (e.g. `SectionHeroBannerBlock = ({block}) => <SectionHeroBanner identity={block.props.identity} />`). Zero visual diff.
- **Risk:** none; nothing renders these blocks yet.

### Phase C-2 — Add `SectionPage` + Dynamic Route Behind Flag
- Create `src/pages/store/SectionPage.tsx`.
- Create `src/routes/_app/store.$slug.tsx` with `beforeLoad` notFound guard.
- Mount the dynamic route alongside legacy ones; the explicit `/store/meat`, `/store/pharmacy`, … still win because TanStack file routes prefer literal segments over `$slug`.
- **Verification:** manually visit `/store/meat-test-slug` → should resolve to `SectionPage` for any registered identity. Legacy URLs unchanged.

### Phase C-3 — Capability Migration on Identities
- Extend each entry in `SECTION_IDENTITY_REGISTRY` with the `capabilities` array (compare, filters, overlays, …).
- Pure data edit; no component change.

### Phase C-4 — Cutover Vertical-by-Vertical (one PR per group)
Order chosen to minimize blast radius (simplest first):

1. **Group γ — pure SDUI** (Restaurants, Baskets, Subscriptions, SchoolLibrary, Wholesale): delete `src/pages/store/<Vertical>.tsx` + `src/routes/_app/store.<vertical>.tsx`. The `$slug` route now serves them. `pageKey` mapping (`reef_<slug>`) handled in `identityToPageKey()`.
2. **Group α — trivial wrapper** (Meat, Pharmacy, Sweets, Recipes, Village): same delete pattern. `pageKey` becomes `category_<slug>`.
3. **Group β — orchestrator shell** (HomeGoods, Dairy, Produce, Kitchen): identical delete; `CompareBar` capability already registered in C-3.

After each group: full build (`tsc --noEmit`), preview smoke test on each removed URL, confirm visual parity (overlays open, filters work, compare bar appears where expected), then merge.

### Phase C-5 — Vertical-Named Sheets → Generic Blocks
- Migrate the 11 Type-B C5 components from §1.2 to block kinds (`product.detail_sheet` variants, `commerce.smart_swap_sheet`, `commerce.basket_card`, `restaurant.menu_section`, …).
- Each migration: register block → swap one consumer → delete legacy file.

### Phase C-6 — Decommission `SduiCategoryPage`
- After Phases C-4 and C-5 are done, no consumer imports `SduiCategoryPage`. Delete it.
- ESLint rule: ban `from "@/pages/store/<Vertical>"` and ban `<SduiCategoryPage>` re-introduction.

### Phase C-7 — Baseline Update
- Update `docs/baselines/PURIFICATION_BASELINE.md` §4 Ratchet Log:
  - **C4: 17 → 3** (deferred bespoke routes only).
  - **C5: − 11** (11 Type-B vertical-named UI sheets vaporized).
- Wave P-C declared closed.

---

## 5. Out of Scope (Reserved for Later Waves)

| Item | Wave |
|---|---|
| `BasketsBuild`, `BasketsSubs`, `CompareHomeGoods` collapse | **P-D Bespoke Tools** |
| Library / Recipes block family (BorrowSheet, BundlesGrid, PrintWizard, RecipeModal, DailyBrowser, WeeklyPlanner) | **P-D Bespoke Tools** |
| `src/lib/{baskets,kitchenMenu,villageMeta,…}.ts` rename to `src/core/catalog/strategies/<slug>` | **P-E Naming Sweep** |
| Pricing strategy file rename (`MeatPricingStrategy`, `SweetsPricingStrategy`, `WholesalePricingStrategy`) | **P-E Naming Sweep** (Article 3a §3 exception confirmation) |
| `src/apps/reef-al-madina/features/<vertical>/` folder structure rename | **P-E Naming Sweep** |
| Removal of `legacyProduct.types` + `legacyRuntime` shim | **P-F Catalog Sovereignty Final** |

---

## 6. Risk Register

| Risk | Mitigation |
|---|---|
| Visual drift after collapse (e.g. missing overlay) | Group-wise cutover (C-4) with manual preview parity check before deletion. |
| Route precedence ambiguity between `/store/meat` (literal) and `/store/$slug` | TanStack Router prefers literal routes; legacy literals stay live until their group's cutover step deletes them in the same commit. |
| `notFound` regressions for unregistered slugs | `beforeLoad` guard added in C-2 — pre-checked before any group cutover. |
| Identity registry bloat | `capabilities` field is additive and small (~3 entries per section). |
| `LayoutFactory` page-key naming inconsistency (`category_*` vs `reef_*`) | Centralized in `identityToPageKey(identity)` — single function, not scattered. |

---

## 7. Acceptance Criteria for Wave P-C Closure

1. `src/routes/_app/store.$slug.tsx` is the **only** vertical section route.
2. `src/pages/store/SectionPage.tsx` is the **only** vertical section page.
3. `SduiCategoryPage` is deleted.
4. C4 ratchet **= 3** (CompareHomeGoods, BasketsBuild, BasketsSubs deferred).
5. C5 reduced by **at least 11** (Type-B sheets in §1.2).
6. `tsc --noEmit` green; preview smoke test passes for every former vertical URL.
7. `PURIFICATION_BASELINE.md` §4 updated with the new counts.

---

**End of Blueprint — no source files were modified during this reconnaissance.**
