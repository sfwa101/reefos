# Phase 29 — The Sovereign Unification Strike

## Pre-flight findings (must confirm before coding)

A quick audit of the codebase shows the request's premises don't all match reality. Calling it out so we don't do redundant work:

1. **Vertical storefronts are already SDUI shells, not hardcoded JSX.**
   - 8 of the 17 store pages (`Meat`, `Sweets`, `Pharmacy`, `Kitchen`, `Produce`, `Recipes`, `Dairy`, `Village`) are 7-line shells that already mount `SduiCategoryPage` with page keys like `category_meat`, `category_pharmacy`, etc.
   - `HomeGoods.tsx` already uses `LayoutFactory` directly.
   - The remaining heavyweights (`Restaurants`, `Subscriptions`, `Baskets*`, `Wholesale`, `CompareHomeGoods`, `SchoolLibrary`) are **domain-specific surfaces** (restaurant menus, subscription wizards, basket builders) — not generic product rails. Forcing them through a `vertical_storefront` rail registry would either lose functionality or require us to register a dozen one-off block types (RestaurantList, SubscriptionWizard, BasketBuilder) that have no reuse value.
   - Recommendation: scope Task 2 to migrating `SduiCategoryPage`'s underlying engine from the legacy `sdui_layouts` runtime to `LayoutFactory` + `ui_layouts` (one change cascades to all 8 generic verticals). Leave domain pages as-is — they already follow stem-cell rules, just don't share the rail-grid pattern.

2. **`SduiCategoryPage` engine status.** Need to read `src/apps/reef-al-madina/features/storefront/components/SduiCategoryPage.tsx` to confirm which engine it currently runs on. If it's already on `LayoutFactory`, Task 2 collapses to seeding `ui_layouts` rows for the 8 categories.

3. **`registry.ts` PageKey union** is currently `"main_hub" | "home" | "sections" | "offers"`. We need to widen it to include `offers_hub`, `maeen_hub`, and the `category_*` keys, and seed corresponding `ui_layouts` rows.

## Scope (after pre-flight)

### Task 1 — Offers + Maeen Hub ascension (Level-3 → Level-4)
- Rewrite `src/pages/Offers.tsx` to mount `<LayoutFactory pageKey="offers_hub" />`, removing `SduiRenderer`, `parseBlocks`, and the `useSpatioTemporalOffers → block mapping` glue. The spatio-temporal data still flows — but as a registered section (`SpatioTemporalOffersRail`) the LayoutFactory renders, not as ad-hoc JSX.
- Rewrite `src/apps/khalil/pages/Hub.tsx` similarly to `<LayoutFactory pageKey="maeen_hub" />`. Move the `HakimGenerativeOverlay` injection logic into a registered section (`MaeenAppGrid` or kept as side-effect hook).
- Register two new sections in `src/core-os/sdui-engine/registry.ts` and add their renderers to `LayoutFactory`'s REGISTRY:
  - `SpatioTemporalOffersRail` (wraps current Offers logic)
  - `MaeenLauncherGrid` (wraps current Hub launcher SDUI consumption)
- Seed `ui_layouts` rows for `offers_hub` and `maeen_hub` with locked Golden Order.

### Task 2 — Vertical storefronts (revised)
- Read `SduiCategoryPage` to see which engine it uses.
- If legacy: refactor it once to use `LayoutFactory` + `ui_layouts` with page keys `category_<slug>`. All 8 verticals inherit the upgrade for free.
- Seed `ui_layouts` rows for `category_meat`, `category_sweets`, `category_pharmacy`, `category_kitchen`, `category_produce`, `category_recipes`, `category_dairy`, `category_village` with the Golden Order `[SearchAndFilters, CategoriesGrid, BundlesRail, BestSellersRail, ProductsGrid]`.
- Domain-specific pages (Restaurants, Subscriptions, Baskets*, Wholesale, CompareHomeGoods, SchoolLibrary) stay as-is and are documented as "domain stem cells, intentionally outside the generic rail registry."

### Task 3 — Token compliance purge
- Add CSS variables to `src/styles.css` in the `:root` and `.dark` blocks:
  - `--tier-bronze`, `--tier-silver`, `--tier-gold`, `--tier-platinum` (HSL triplets)
  - `--surface-mint` (replacement for the inline `#E8F8EF`)
- Refactor `src/components/LoyaltyProgress.tsx` to read `hsl(var(--tier-*))` (no inline hex).
- Refactor `src/components/MegaEventBanner.tsx` `#dc2626` → `hsl(var(--destructive))`.
- Refactor `src/pages/store/SchoolLibrary.tsx` inline `#E8F8EF` → `bg-[hsl(var(--surface-mint))]` (or a Tailwind class via `styles.css`).

### Task 4 — Archive sync
- Append Phase 29 entry to `ARCHITECTURAL_ROADMAP.md` summarizing the engine unification, the corrected scope on verticals, and the token purge.
- Bump SDUI Level-4 coverage figure in the manifest (will be ~85% after this strike, not 100% — domain stem cells are intentional).

## Files touched (≈12)

Created:
- `src/core-os/sdui-engine/blocks/SduiSpatioTemporalOffersRail.tsx`
- `src/core-os/sdui-engine/blocks/SduiMaeenLauncherGrid.tsx`
- migration: seed `ui_layouts` rows for `offers_hub`, `maeen_hub`, and `category_*` (8 rows)

Edited:
- `src/pages/Offers.tsx` (full rewrite, ~30 lines)
- `src/apps/khalil/pages/Hub.tsx` (full rewrite, ~40 lines)
- `src/apps/reef-al-madina/features/storefront/components/SduiCategoryPage.tsx` (engine swap)
- `src/apps/reef-al-madina/features/storefront/home/components/LayoutFactory.tsx` (register 2 new sections)
- `src/core-os/sdui-engine/registry.ts` (widen PageKey, add 2 SectionMeta entries)
- `src/core-os/sdui-engine/types.ts` (add 2 SectionKey literals)
- `src/apps/reef-al-madina/features/storefront/home/hooks/useUiLayout.ts` (add fallback orders)
- `src/styles.css` (4 tier tokens + 1 surface token, light + dark)
- `src/components/LoyaltyProgress.tsx` (hex → token)
- `src/components/MegaEventBanner.tsx` (hex → token)
- `src/pages/store/SchoolLibrary.tsx` (hex → token)
- `ARCHITECTURAL_ROADMAP.md` (Phase 29 entry)

## Honest "100% coverage" caveat
The Emperor's brief asks for 100% Level-4 coverage. After this strike the **generic SDUI rail surfaces** will be 100% on LayoutFactory + ui_layouts. The 6 domain-specific surfaces (Restaurants menu, Subscriptions wizard, Baskets builder, etc.) are intentionally NOT generic-rail-shaped — they're stem-cell components for one-of-a-kind flows. I'll document them as "Tier-2 stem cells" rather than retrofitting fake SDUI on top of bespoke UX. If you want them ascended too, that's Phase 30 with proper section primitives (FormStep, WizardChain, MenuList).

## Approval requested
Confirm:
1. ✅ Proceed with revised Task 2 scope (engine swap inside `SduiCategoryPage` + 8 seed rows; leave 6 domain pages)?
2. ✅ Acceptable that final Level-4 figure is ~85% (generic surfaces 100%, domain pages tracked separately)?

On approval I'll execute end-to-end in one pass.
