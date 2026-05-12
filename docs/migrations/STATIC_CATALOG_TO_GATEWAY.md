# Wave P-B — Static Catalog Killer · Migration Blueprint

> **Status:** Reconnaissance complete · Read-only audit
> **Authority:** `SALSABIL_MASTER_ROADMAP_AND_PURIFICATION_PLAN.md` · `SYSTEM_CONSTITUTION.md` (Articles 3, 11, 12) · `docs/baselines/PURIFICATION_BASELINE.md` (C2)
> **Mandate:** Eradicate every consumer of `@/lib/products` and route all catalog reads through `catalogGateway` / `searchRegistry` / `FeedRuntime`. Cart must store **identity + intent** only, not denormalized product snapshots.

---

## 0. Counter Drift Notice (mandatory reconciliation before P-B lands)

| Counter | Baseline (Wave P-0) | Re-measured (Wave P-B recon) | Delta | Disposition |
|---|---:|---:|---:|---|
| C2 — `@/lib/products` importers | **58** | **74** | **+16** | Baseline §1 frozen forever; the new measurement becomes the working ceiling for Wave P-B. The drift (+16) is recorded here as a blueprint correction — the next ratchet row in `PURIFICATION_BASELINE.md` §4 must use the **74** figure as the pre-P-B value before counting reductions. No PR may push this number above 74. |

> The baseline §1 / §2 numbers remain immutable. Drift is reconciled in §4 (Ratchet Log), not by editing history.

---

## 1. Static Catalog Surface (what `@/lib/products` exports today)

`src/lib/products.ts` (181 lines) exposes:

| Symbol | Kind | Role | Replacement plane |
|---|---|---|---|
| `Product`, `ProductVariant`, `ProductAddon`, `ProductSource`, `DbRow` | types | Legacy denormalized shape (price, image, brand, stock, metadata) | `ProductCardVM` / `ProductDetailsVM` from `@/core/catalog/types` |
| `PRODUCT_COLUMNS`, `rowToProduct` | data-plane | Direct Supabase row mapping | **Sanctioned only inside** `src/core/catalog/**`; remove from UI |
| `isPerishable`, `productAvailableInZone` | predicates | Capability checks | `resolveProductCapabilities` → capability keys (`perishable`, `zone.eligible`) |
| `products` (Proxy array), `getById`, `bySource` | sync reads | UI synchronous reads of the entire catalog | **Forbidden in UI.** Replace with `catalogGateway.listSection(...)` / `catalogGateway.getById(...)` (async, paginated, capability-aware) |
| `PRODUCTS_QUERY_KEY`, `bindCatalogSource`, `registerProducts`, `ensureProductsLoaded`, `refetchProducts` | bootstrap | Global TanStack-Query catalog hydration | `catalogGateway` owns its own cache (`catalogCache`); no global hydrate from UI |

**Architectural verdict:** `@/lib/products` is the last surviving "global denormalized array". Every UI read of it is an Article 3 violation (UI reaching past the gateway into a singleton).

---

## 2. Infected Inventory — 74 files, grouped by domain

Files marked **(R)** are **raw consumers** (call `getById` / `products` / `bySource`). Files marked **(T)** import only types (`Product`, `ProductVariant`, `ProductAddon`). Type-only importers migrate by swapping to `ProductCardVM` / `ProductDetailsVM` / canonical variant types — no behavioral change.

### A. Cart Engine (12) — store + calculations + WhatsApp + sync

| File | Reads | Notes |
|---|---|---|
| `src/store/useCartStore.ts` | (T+R) | Cart line items currently embed `Product`. **Highest-blast-radius file.** |
| `src/lib/cartSync.ts` | (T+R) | Persistence + dehydration. Must write IDs + variants only. |
| `src/apps/reef-al-madina/features/cart/types/cart.types.ts` | (T) | Local cart types. |
| `src/apps/reef-al-madina/features/cart/hooks/useCartCalculations.ts` | (T+R) | Totals, deposits, taxes. |
| `src/apps/reef-al-madina/features/cart/hooks/useCartOrchestrator.ts` | (T+R) | Top orchestrator. |
| `src/apps/reef-al-madina/features/cart/hooks/useCartVendorGrouping.ts` | (T+R) | Groups by vendor — needs `vm.attributes.vendorId`. |
| `src/apps/reef-al-madina/features/cart/hooks/useCartWhatsApp.ts` | (T+R) | Builds plaintext order. |
| `src/apps/reef-al-madina/features/cart/hooks/useSharedCartAdapter.ts` | (T+R) | Real-time sync glue. |
| `src/apps/reef-al-madina/features/cart/components/CartLineItem.tsx` | (T+R) | Renders one line. |
| `src/apps/reef-al-madina/features/cart/components/CartCrossSellRail.tsx` | (R) | Cross-sell suggestions. |
| `src/apps/reef-al-madina/features/cart/components/HakimPredictiveBasket.tsx` | (R) | AI suggestions. |
| `src/apps/reef-al-madina/features/cart/components/VendorGroupCard.tsx` | (T+R) | Vendor accordion. |

### B. Search & Feeds (3)

| File | Reads | Notes |
|---|---|---|
| `src/modules/search/hooks/useUniversalSearch.ts` | (R) | Universal search across catalog. → `searchRegistry.query(...)`. |
| `src/lib/sovereignCatalog.ts` | (T+R) | Cross-section catalog helper consumed by feeds. → fold into `FeedRuntime` or `catalogGateway.listAll(...)`. |
| `src/components/system/CatalogBootstrap.tsx` | (R) | Calls `bindCatalogSource` / `ensureProductsLoaded` at app boot. → **Delete entirely** once gateway is the only data plane. |

### C. Queries & Hooks (5)

| File | Reads | Notes |
|---|---|---|
| `src/hooks/useProductsQuery.ts` | (R) | Generic product list query. → wrap `catalogGateway.listSection`. |
| `src/hooks/useInfiniteCatalog.ts` | (R) | Paginated catalog. → `catalogGateway.listSection({ cursor })`. |
| `src/hooks/useBuyAgainProducts.ts` | (R) | "Buy again" personalization. → `RecommendationResolver` → `FeedRuntime`. |
| `src/apps/reef-al-madina/features/pharmacy/data.ts` | (R) | Pharmacy-specific catalog reads. → `catalogGateway.listSection({ slug:'pharmacy' })`. |
| `src/apps/reef-al-madina/features/library/data.ts` | (R) | Library catalog reads. → `catalogGateway.listSection({ slug:'school-library' })`. |

### D. Core Engines (7) — pricing strategies & adapters

| File | Reads | Notes |
|---|---|---|
| `src/core/engine/pricing/PricingEngine.ts` | (T) | Type-only on `Product`. Swap to a narrow `PricingInput` interface. |
| `src/core/engine/pricing/types.ts` | (T) | Engine input/output contracts. |
| `src/core/engine/pricing/cartPricingAdapter.ts` | (T+R) | Bridges cart → pricing. |
| `src/core/engine/pricing/hooks/useLivePrice.ts` | (T+R) | Reactive price hook. |
| `src/core/engine/pricing/strategies/MeatPricingStrategy.ts` | (T) | **Article 3a violation** flagged separately for Wave P-C/P-E (vertical-named). Type swap only here. |
| `src/core/engine/pricing/strategies/SweetsPricingStrategy.ts` | (T) | Same as above. |
| `src/core/engine/pricing/__tests__/*.test.ts` (×2) | (T+R) | Test fixtures — must move to capability-keyed fixtures. |

### E. Leaf Components (47) — display only

Storefront (Reef · home + storefront shell):
- `src/apps/reef-al-madina/features/storefront/home/components/BundleCard.tsx`
- `src/apps/reef-al-madina/features/storefront/home/components/DetailSheet.tsx` (still imports `getById` for cart bridge — see Cart strategy in §3)
- `src/apps/reef-al-madina/features/storefront/home/components/ProductCard.tsx`
- `src/apps/reef-al-madina/features/storefront/home/components/QuickMealsRail.tsx`
- `src/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator.ts` (transitional `vmToProduct` bridge — kill in §3 Step 4)
- `src/apps/reef-al-madina/features/storefront/components/SduiCategoryPage.tsx`
- `src/apps/reef-al-madina/features/storefront/components/StoreCategoryGrid.tsx`

Offers / promotions:
- `FlashSalesGrid.tsx`, `FulfillmentBadge.tsx`, `PersonalizedDealsRail.tsx`, `SectionOffersRail.tsx`, `SponsoredRestaurantRail.tsx`
- `src/core-os/sdui-engine/blocks/offers/SduiOfferFlashSale.tsx`, `SduiPredictiveRefillRail.tsx`

Baskets / library / recipes / restaurants / sweets / wholesale (vertical features that survive as **capability-driven sections**, not as hardcoded verticals — Article 3a will reshape them in P-C):
- `BasketsBuilderSection.tsx`
- `BorrowCard.tsx`, `BorrowSheet.tsx`, `BundlesGrid.tsx`, `PrintWizard.tsx`, `SchoolLibrarySection.tsx`
- `RecipeModal.tsx`
- `RestaurantsMenuSection.tsx`, `RestaurantBlock.tsx`, `RestaurantItemSheet.tsx`
- `VariantPicker.tsx` (sweets), `SweetsProductSheet.tsx`
- `WholesaleComparisonSection.tsx`
- `ProductPeekSheet.tsx`

Legacy `src/components/**` (pre-feature-folder leftovers — many slated for deletion in P-C/P-E):
- `ProductCard.tsx`, `ProductCarousel.tsx`, `SinglePageStore.tsx`
- `baskets/BasketCard.tsx`, `baskets/BasketSheet.tsx`, `baskets/SmartSwapSheet.tsx`
- `kitchen/MealSheet.tsx`
- `meat/ButcherSheet.tsx`
- `restaurants/RestaurantBlock.tsx`, `restaurants/RestaurantItemSheet.tsx`
- `store/BuyItAgainRail.tsx`, `store/DualNavStore.tsx`, `store/VolumeDealsRail.tsx`
- `sweets/SweetsProductSheet.tsx`

Pages still doing direct catalog reads:
- `src/pages/ProductDetail.tsx`, `src/pages/RestaurantDetail.tsx`, `src/pages/Search.tsx`, `src/pages/SubCategory.tsx`
- `src/pages/account/Favorites.tsx`, `src/pages/account/Orders.tsx`
- `src/pages/store/BasketsBuild.tsx`

---

## 3. Replacement Map (per category)

| Category | Current call | Replacement | Layer that owns it |
|---|---|---|---|
| Cart line storage | `cart.lines: { product: Product }[]` | `cart.lines: { productId, variantId?, addons[], qty, capturedPrice, capturedName, capturedImage }` (identity + frozen pricing intent + thin display snapshot for offline rendering) | `useCartStore` |
| Cart display hydration | `getById(line.productId)` synchronously | `useCartLineHydrator(lineIds)` → `catalogGateway.getManyById(ids)` returning `ProductCardVM[]` keyed by id; falls back to `capturedName/capturedImage` while loading or when offline | new hook in `src/core/catalog/hooks/useCartHydration.ts` |
| Cart calculations | reads `line.product.price` etc. | reads `line.capturedPrice` (deterministic, immune to upstream price drift mid-checkout) and re-validates against `catalogGateway.priceQuote(line)` at checkout submission | `useCartCalculations` + new `priceQuote` gateway method |
| Cross-sell / predictive / refill | `bySource(...)` / `products.filter(...)` | `RecommendationResolver` via `FeedRuntime` source (`recommendationsFeed`, `trendingFeed`) | `core/feeds` |
| Universal search | `products.filter(predicate)` | `searchRegistry.query({ q, filters, capabilities })` | `core/search` |
| Sovereign catalog helper | `bySource('xxx')` | `catalogGateway.listSection({ slug })` (async, capability-filtered) | `core/catalog/gateway` |
| Section listings (storefront, offers, sweets, library, etc.) | `products.filter(p => p.subCategory === '…')` | `catalogGateway.listSection({ slug, filters })` returning `ProductCardVM[]` | `core/catalog/gateway` |
| Product detail (`ProductDetail.tsx`, sheets) | `getById(id)` | `catalogGateway.getDetails(id)` returning `ProductDetailsVM` | `core/catalog/gateway` |
| Pricing engine inputs | `Product` type | narrow `PricingInput` (id, basePrice, unit, capabilities, attributes) — engine becomes vertical-agnostic | `core/engine/pricing/types.ts` |
| Bootstrap (`CatalogBootstrap`, `bindCatalogSource`, `ensureProductsLoaded`) | global hydrate | **Delete.** Gateway hydrates per-section on demand via `catalogCache`. | n/a |
| Type imports (`Product`, `ProductVariant`, `ProductAddon`) | `import { Product } from "@/lib/products"` | `import { ProductCardVM, ProductDetailsVM, ProductVariantVM, ProductAddonVM } from "@/core/catalog/types"` | `core/catalog/types` |

---

## 4. Cart Decoupling Strategy (the load-bearing change)

The Cart is the only surface that must **persist** product information across sessions and survive offline. We adopt a strict **identity + intent + display snapshot** model:

```text
CartLine {
  id: string                  // line uuid
  productId: string           // canonical catalog id
  variantId?: string
  addonIds: string[]
  qty: number
  modifiers?: Record<string, unknown>   // ModifierEngine state

  // Frozen at add-to-cart time — immune to upstream drift mid-session
  capturedPrice: number       // unit price the customer agreed to
  capturedCurrency: string
  capturedName: I18nText      // for offline / loading rendering only
  capturedImage?: string      // for offline / loading rendering only
  capturedAt: ISODateString
}
```

Rules:
1. **No `Product` objects in the store.** Persisted state is JSON-serialisable, vertical-agnostic, and forward-compatible.
2. **Display = hydration, not storage.** `useCartLineHydrator` issues a single `catalogGateway.getManyById(productIds)` call per render cycle, cached in `catalogCache`. `capturedName/Image` are the offline fallback.
3. **Pricing is double-booked.**
   - In-session totals use `capturedPrice` (no surprise re-pricing while the user is browsing).
   - Checkout submission calls `catalogGateway.priceQuote(lines)` and surfaces a delta sheet if upstream prices changed (Article 11 — Sovereign Pricing Integrity).
4. **Vendor grouping** reads `attributes.vendorId` from the hydrated `ProductCardVM`, not from a `Product` field. If the line is unhydrated (offline), it groups under a single `unknown-vendor` bucket and shows a skeleton.
5. **WhatsApp / share-cart export** runs after hydration; offline export uses `capturedName` only and stamps the message with a "snapshot" notice.
6. **Migration of legacy persisted carts** — a one-shot `migrateLegacyCartShape()` runs on app boot inside `useCartStore` rehydrate, lifting `line.product.id → line.productId`, copying `price/name/image → captured*`, then dropping `line.product`. After 30 days, the migration shim is removed (recorded in §6 Ratchet Log of the baseline as a separate row when it lands).

---

## 5. Ordered Execution Plan (P-B Refactor — to be run in the next prompt)

Each step is **atomic, build-green, and reduces C2 monotonically**. No step is allowed to land if the build is red or C2 increases.

| Step | Scope | Files | Exit signal |
|---|---|---|---|
| **B-1** | Add gateway plumbing (no consumers yet) | `core/catalog/gateway/catalogGateway.ts` (new methods: `getManyById`, `getDetails`, `priceQuote`); `core/catalog/hooks/useCartHydration.ts` (new) | Methods exist, unit-tested, zero UI imports yet → C2 unchanged. |
| **B-2** | Re-shape `CartLine` + ship migration shim | `store/useCartStore.ts`, `lib/cartSync.ts`, `features/cart/types/cart.types.ts` | Persisted carts migrate cleanly; existing UI still compiles via `capturedName/Image`; cart calculations switched to `capturedPrice`. C2 −3. |
| **B-3** | Migrate Cart leaves to hydrator | all 12 files in §2.A | Cart UI reads only `ProductCardVM[]` from `useCartLineHydrator`; zero `getById` calls in cart. C2 −12. |
| **B-4** | Pricing engine decoupling | all 7 files in §2.D | Engine accepts `PricingInput`, not `Product`. Tests rewritten with capability fixtures. C2 −7. |
| **B-5** | Hooks & queries | §2.C (5 files) | All wrap `catalogGateway`. C2 −5. |
| **B-6** | Search & feeds | §2.B (3 files) | `useUniversalSearch` → `searchRegistry`; `sovereignCatalog` folded into `FeedRuntime`; `CatalogBootstrap` deleted. C2 −3. |
| **B-7** | Storefront leaves | §2.E storefront + offers + SDUI subgroups (~14 files) | All consume `ProductCardVM` from orchestrators. C2 −14. |
| **B-8** | Vertical leaves (baskets, library, recipes, restaurants, sweets, wholesale, peek sheet) | §2.E vertical subgroups (~14 files) | Same. C2 −14. |
| **B-9** | Legacy `src/components/**` + page-level reads | §2.E legacy + 7 pages | All consume gateway. C2 −16. |
| **B-10** | Eradicate `src/lib/products.ts` | delete file; flip ESLint rule from `warn` → `error` | `rg "@/lib/products" src/` → `CLEAN`. C2 = **0**. ADR appended. |
| **B-11** | Baseline ratchet | `docs/baselines/PURIFICATION_BASELINE.md` §4 | Append row: `C2 = 0`. Wave P-B closed. |

Verification after every step: `rg -l "@/lib/products" src/ | wc -l` strictly decreases (or equals after B-1) and `bun run build` is green.

---

## 6. Out of Scope for Wave P-B

- **C1 (UI `supabase.from(...)`)** — owned by Wave P-D. Any direct DB call discovered while migrating a leaf must be **left in place** (a TODO in the file's header) and tracked separately.
- **C4 (hardcoded section routes)** — owned by Wave P-C. We do not touch `src/pages/store/*.tsx` route files in P-B; we only swap their internal catalog reads.
- **C5 (vertical-named files — Article 3a)** — `MeatPricingStrategy`, `SweetsPricingStrategy`, `components/meat/**`, `components/sweets/**`, `components/kitchen/**` keep their names in P-B; they are renamed/dissolved in P-C/P-E.
- **Capability-driven event emission** — Wave P-E.
- **`HGProduct`** — already eradicated in P-A.

---

## 7. Verification Checklist (Wave P-B exit criteria)

- [ ] `rg "@/lib/products" src/` returns zero hits.
- [ ] `src/lib/products.ts` is deleted.
- [ ] ESLint `no-restricted-imports` rule for `@/lib/products` is **error** (not warn).
- [ ] `useCartStore` persisted shape contains no `product: Product` field; legacy migration shim active for ≥1 release.
- [ ] DEV watchdog never fires on cart, search, storefront, or any migrated leaf.
- [ ] `bun run build` green; targeted tests for `PricingEngine`, `useCartCalculations`, `catalogGateway.getManyById`, and `useCartLineHydrator` pass.
- [ ] `docs/baselines/PURIFICATION_BASELINE.md` §4 shows the P-B row with `C2 = 0`.

---

*End of blueprint. No application code was modified.*
