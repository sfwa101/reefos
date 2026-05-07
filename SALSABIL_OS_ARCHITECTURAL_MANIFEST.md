# 🏛️ SALSABIL OS — ARCHITECTURAL MANIFEST

> **Generated:** Phase VIII-Dev v3 — **Restoration + Kernel Purification (Phase 2) complete**
> **Architecture:** Umbrella OS with kernel (`core-os/`) + Family of Apps (`apps/`) + Dev-Layer (`components/system/`)
> **Last update:** 2026-05-07 (Phase 2 close-out)

---

## 🧭 Phase 2 Snapshot — What changed since Phase 1

| Axis | Before (Phase 1) | After (Phase 2 — current) |
|---|---|---|
| **Identity** | Khalil → Diwan rename half-applied | **Maeen (معين)** is the canonical sovereign hub: route `/maeen`, registry id `maeen`, FAB label `معين · Sovereign Hub`, single localStorage key `salsabil.dev.maeenAsDefault` |
| **Dev-Node FAB** | Stripped from preview build via `import.meta.env.DEV` | **Always rendered** in `__root.tsx` (`z-[80]`, `bottom 120px`) outside the provider tree |
| **SDUI types** | Owned by `apps/reef-al-madina/.../sdui.types.ts` and back-imported by the kernel | **Kernel-owned** in `src/core-os/sdui-engine/types.ts`; reef path is a thin re-export shim |
| **Maeen Hub data** | Hub component called `supabase.from("orders")` directly | **Kernel adapter** `src/core-os/maeen/useActiveDelivery.ts` (TanStack Query, 60s `staleTime`); Hub is presentation-only |
| **Wallet bar** | `SalsabilStatusBar` issued one raw `supabase.from("wallets")` per mount → N parallel fetches across shells | TanStack Query `["wallet","status-bar", userId]`, single in-flight request per session, hydration-safe `—` / `…` placeholders |
| **Subdomain whitelist** | Carried dead `/khalil`, `/diwan` entries | `["/maeen", "/admin/design", "/asrab", "/nabd"]` |
| **Cache / PWA** | Aggressive persister + service worker | `installEdgePersister` disabled, `registerPWA` disabled, `public/sw.js` is a kill switch, `queryPersister` BUSTER bumped to `salsabil-os-v2-dev` |

Outstanding architectural debt is captured in `ARCHITECTURAL_ROADMAP.md` §6 (Hakim AI cross-app behavioral engine, Tayseer POS sovereign payment aggregator).



---

## 🧭 Phase 3 Snapshot — Apple-tier Gestures, Haptics, Bottom-Sheet Peek

| Axis | Before (Phase 2) | After (Phase 3 — current) |
|---|---|---|
| **Gesture primitive** | None — only `onClick` + `active:scale-95` everywhere | `src/hooks/useLongPress.ts` — pointer-event long-press (≥400ms, 8px move-tolerance) with 15ms `navigator.vibrate` haptic |
| **Product detail surface (Supermarket)** | Tap → full-page route navigation `/product/$id` | Tap → in-context **`ProductPeekSheet`** (vaul `snapPoints={[0.8, 1]}`), drag-to-dismiss, no scroll-spy disruption |
| **Quick Peek** | Not available | Long-press → Radix `Popover` w/ fast actions (favourite, compare, full details) |
| **`ProductCard` variants** | `grid \| carousel \| wide` | + `minimal` — image · 1-line title · price · add (Apple-tier density). Live in **both** `@/components/ProductCard` and `apps/reef-al-madina/.../home/components/ProductCard` |
| **Haptics** | Zero `navigator.vibrate` calls in repo | 10ms thud on add-to-cart (every variant) · 15ms thud on long-press · 15ms thud on peek-sheet add |
| **Supermarket page** | Two parallel implementations: `src/modules/supermarket/SupermarketPage.tsx` (active) AND legacy `src/pages/store/Supermarket.tsx` (DualNavStore) | Single source of truth: legacy page **decommissioned** (deleted) |
| **Detail composition** | `pages/ProductDetail.tsx` was the only consumer of `ProductGallery` + `StickyAddCTA` | `ProductPeekSheet` now reuses both — zero duplication of detail logic |

---

## 🧬 OS Kernel: `src/core-os/`
The shared kernel that powers every app in the Salsabil family.

| Module | Purpose |
|---|---|
| `app-registry/` | **Mini-App Manifest** — single source of truth for every app (id, route, icon, accent, visibility predicate) |
| `event-bus/` | **Salsabil Event Fabric** — push-based behaviour stream shared across apps |
| `finance/` | **Tayseer Engine** — wallet, balance, savings jars, charity, affiliate |
| `hakim-ai/` | **Hakim** — central AI brain (advisor, anomalies, insights, generative overlay) |
| `sdui-engine/` | **Server-Driven UI** — layout runtime + Realtime cache invalidation + block registry |
| `system-editor/` | **Visual Layout Editor** — drag/drop SDUI authoring (`/admin/design`) |
| `barq-logistics/` | **BARQ (برق)** — geo zones, smart routing, delivery quotes |
| `modifier-engine/` | **Universal Modifier Atoms** — vertical-agnostic product configurators |
| `capabilities/` | **Scoped Capability Atoms** — search/scope primitives reused by every app |
| `ui/` | **OS-level UI atoms** — `SalsabilStatusBar` (hydration-safe identity + wallet ribbon). **Phase 3 adoption:** Apple-tier mobile primitives — `useLongPress` (Quick-Peek pointer hook, 400ms + 15ms haptic) and `vaul` Drawer with `snapPoints={[0.8, 1]}` for in-context product overlays (`ProductPeekSheet`). Both are kernel-grade primitives reusable across every app shell. |

## 🏘️ Family of Apps: `src/apps/`
| App | ID | Route | Status | Scope |
|---|---|---|---|---|
| `reef-al-madina/` | `reef` | `/` | ✅ Live | Retail super-app — supermarket, meat, pharmacy, recipes, sweets, library, baskets |
| `khalil/` (Hub source) | `maeen` | `/maeen` | ✅ Live | **معين — Sovereign Empire Gateway**. Unified launcher (SDUI `khalil_hub` layout). Renamed Khalil → Al-Diwan → **Maeen** in Phase VIII-Dev v3 Restoration. |
| `asrab/` | `asrab` | `/asrab` | 🟡 Soon | Real Estate & Travel super-app |
| `nabd/` | `nabd` | `/nabd` | 🟡 Soon | Health Sector — telemedicine, clinics, labs |

> **Naming note:** the on-disk folder `src/apps/khalil/` is preserved for git history; the public identity, route, registry id, and UI label are **معين / Maeen**. A one-shot localStorage migration in `DevOSNavigator` folds legacy `khalilAsDefault` / `diwanAsDefault` flags into `salsabil.dev.maeenAsDefault`.

## 🛰️ Routing Layer: `src/routes/` (TanStack Start, file-based)
| Route file | URL | Notes |
|---|---|---|
| `__root.tsx` | — | Global providers, `SubdomainGuard`, hydration-safe shell. Mounts `<DevOSNavigator />` outside the provider tree (always rendered, including preview builds) so cache/provider failures cannot hide it. |
| `_app.tsx` | — | Customer `AppShell` layout (TopBar, TabBar, CartPanel, Hakim edge worker). |
| `_app.maeen.tsx` | `/maeen` | **Maeen Sovereign Hub** (was `_app.diwan.tsx`, originally `_app.khalil.tsx`). |
| `admin.design.tsx` | `/admin/design` | System Editor (SDUI Layout Editor Grid). |
| `driver.*`, `vendor.*`, `pos.tsx`, `admin.*` | various | Internal portals reachable from the Dev-Node Admin Nexus. |

## 🛠️ Dev-Layer: `src/components/system/`
| File | Role |
|---|---|
| `DevOSNavigator.tsx` | **Salsabil Dev-Node** — circular FAB (bottom-left, `z-[80]`, `bottom 120px` above TabBar/BottomCTA) that expands into a blurred capsule. Contains: **Maeen** launcher (pulsing), App switcher (driven by `appRegistry`), Admin Nexus overlay (Master Admin / System Editor / Driver / Vendor / POS), `Maeen-as-Default` toggle, and **God Mode toggle**. God Mode flips the FAB to an amber/rose gradient with a `Crown` icon and a pulsing amber dot; `window.SALSABIL_GOD_MODE` is re-synced on every route change. **Always rendered** (preview + prod) — Phase VIII-Restoration removed the `import.meta.env.DEV` gate. |
| `SubdomainGuard.tsx` | Hostname-based redirector. `OS_WHITELIST_PATHS = ["/maeen", "/admin/design", "/asrab", "/nabd"]` bypasses the admin-host auto-redirect so OS surfaces remain reachable. |
| `CatalogBootstrap.tsx`, `BehaviorTrackerBootstrap.tsx`, `LiveRulesBootstrap.tsx` | One-shot bootstrap atoms for catalog cache, behaviour tracking, and live pricing rules. |
| `GlobalErrorBoundary.tsx` | Top-level React error boundary. |

## 🦸 God Mode (Absolute Manager Mode) — `src/lib/godMode.ts`
Master flag for admin QA. Sources, in order: `window.__SALSABIL_GOD_MODE__`, `window.SALSABIL_GOD_MODE`, `localStorage["salsabil.dev.godMode"]`. When active:
- `useDriverEngine` returns a mocked driver profile + tasks + orders.
- `useVendorOperations` injects mocked vendor IDs + products (bypasses `user_vendor_ids` RPC).
- `HomeRedirector` skips the role-based default-view redirect.
- The Dev-Node FAB flips to its **Crown / amber-rose** identity so the operator always sees they are in elevated mode.

## 🔐 Universal Identity Gate
`src/context/AuthContext.tsx` → **Salsabil OS National ID** — wraps the whole app tree in `__root.tsx`. Session, profile and Tayseer wallet identity persist across every app under `src/apps/*`. The `SalsabilStatusBar` atom renders a hydration-safe `—` / `…` placeholder on first paint and now reads its wallet balance through a **TanStack Query** (`["wallet", "status-bar", userId]`, 60s `staleTime`) — a single cached fetch shared across every shell mount instead of N parallel `supabase.from("wallets")` calls.

## 🧊 Cache & PWA Posture (Phase VIII-FIX, still in force)
- `installEdgePersister` is **disabled** in `src/router.tsx` to guarantee fresh network data during the OS rollout.
- `registerPWA()` is disabled and `__root.tsx` actively **unregisters** any existing service workers.
- `public/sw.js` is a **Kill Switch** that clears all caches and unregisters itself.
- `src/lib/queryPersister.ts` BUSTER = `"salsabil-os-v2-dev"`.

## 🧬 Kernel Purification (Phase 2 — current)
- **V-1 (Type ownership):** SDUI types live in `src/core-os/sdui-engine/types.ts`. The legacy reef path is a thin re-export shim only.
- **V-2 (App→DB boundary):** the Maeen Hub no longer calls `supabase.from(...)` directly. Active-delivery detection is exposed by the kernel adapter `src/core-os/maeen/useActiveDelivery.ts` and consumed via TanStack Query. UI components never touch Supabase.
- **R-4 (Network bleed):** `SalsabilStatusBar` wallet read is cached via TanStack Query — stable key, single in-flight request per session.

---

## 🗄️ Database Schema Principles (Phase 4 codification)

The DB layer is governed by four invariants — Phase 4's Hakim Predictive Cart work is the first to fully exercise all four:

1. **Single source of truth, no localStorage shadows.** Any state that needs to survive a device switch lives in Postgres under RLS. The legacy `localStorage["reef-subscriptions-v1"]` store and `src/lib/buyAgain.ts` are being decommissioned in favour of `public.saved_baskets` and `public.order_items` respectively.
2. **Polymorphic tables over forked schemas.** When several persisted concepts share a shape (manual basket, predicted basket, recurring subscription), they live in one table discriminated by a `source` enum (e.g. `saved_baskets.source`). We do not maintain parallel `subscriptions` / `predictions` tables.
3. **Materialized views feed AI context, never the UI directly.** Aggregations used by Hakim (e.g. `public.user_product_frequency` over `orders ⨝ order_items`) are materialized for cheap repeated reads, indexed uniquely on their natural key to support `REFRESH ... CONCURRENTLY`, and have `select` revoked from `authenticated` — only `SECURITY DEFINER` functions and service-role callers (the Hakim edge function) may read them. UI hooks must never query a materialized view directly.
4. **RLS is the perimeter, edge functions are the lens.** Per-user tables enforce `auth.uid() = user_id` for every CRUD path. Cross-user aggregations live behind edge functions / `SECURITY DEFINER` RPCs that scope reads explicitly.

---

## 🌳 Physical Tree (depth ≤ 10)

```
src/core-os/
├── barq-logistics  // BARQ (برق) — geo + delivery engine
│   ├── core
│   │   ├── index.ts
│   │   ├── quote.ts
│   │   └── types.ts
│   └── useSmartLogistics.ts  // Smart logistics realtime sync
├── finance  // Tayseer Engine — wallet/balance/savings/charity
│   ├── components
│   │   ├── ActionGrid.tsx
│   │   ├── BalanceCard.tsx
│   │   ├── BalanceCardsCarousel.tsx
│   │   ├── GameyaCreationSheet.tsx
│   │   ├── GameyaDetailsSheet.tsx
│   │   ├── GameyasDockContent.tsx
│   │   ├── GameyasTab.tsx
│   │   ├── InsightsDockContent.tsx
│   │   ├── JoinGameyaSheet.tsx
│   │   ├── MiniStatGrid.tsx
│   │   ├── NeoCardsCarousel.tsx
│   │   ├── NeoSuperCard.tsx
│   │   ├── NetWorthCard.tsx
│   │   ├── OperationsDockContent.tsx
│   │   ├── VaultsDockContent.tsx
│   │   ├── VaultsGrid.tsx
│   │   ├── WalletAffiliateHub.tsx
│   │   ├── WalletAnalytics.tsx
│   │   ├── WalletAssetConvertSheet.tsx
│   │   ├── WalletBalanceCard.tsx
│   │   ├── WalletCharityHub.tsx
│   │   ├── WalletPosBarcode.tsx
│   │   ├── WalletSavingsJars.tsx
│   │   ├── WalletTabs.tsx
│   │   ├── WalletTopupDialog.tsx
│   │   ├── WalletTransactionList.tsx
│   │   ├── WalletTransferDialog.tsx
│   │   └── WithdrawDialog.tsx
│   ├── hooks
│   │   ├── useAffiliateEngine.ts
│   │   ├── useGameyas.ts
│   │   ├── useHideBalance.ts
│   │   ├── useTransferLogic.ts
│   │   ├── useWalletAssets.ts
│   │   ├── useWalletBalance.ts
│   │   ├── useWalletDashboard.ts
│   │   ├── useWalletSavings.ts
│   │   └── useWalletTransactions.ts
│   ├── lib
│   │   └── walletAdvisor.ts
│   └── types
│       └── wallet.types.ts
├── hakim-ai  // Central AI Brain
│   ├── components
│   │   └── HakimPulseMonitor.tsx
│   └── hooks
│       └── useHakimEdgeWorker.ts
├── sdui-engine  // Server-Driven UI runtime + admin
│   ├── SectionFrame.tsx
│   ├── admin
│   │   ├── blocks
│   │   │   ├── ComputedColumnBlock.tsx
│   │   │   ├── FieldGroupBlock.tsx
│   │   │   ├── FormFieldBlock.tsx
│   │   │   ├── MapBlock.tsx
│   │   │   ├── MapCanvas.tsx
│   │   │   ├── RpcButtonBlock.tsx
│   │   │   └── TableColumnBlock.tsx
│   │   ├── components
│   │   │   ├── AdminBlockRenderer.tsx
│   │   │   ├── AdminEmptyState.tsx
│   │   │   └── AdminErrorBoundary.tsx
│   │   ├── engine
│   │   │   ├── AdminFormEngine.tsx
│   │   │   └── AdminTableEngine.tsx
│   │   ├── hooks
│   │   │   ├── useAdminAction.ts
│   │   │   ├── useAdminNavigation.ts
│   │   │   ├── useEntityDefinition.ts
│   │   │   ├── useEntityList.ts
│   │   │   ├── useEntityMutation.ts
│   │   │   ├── useEntityRecord.ts
│   │   │   └── useSchemaRollback.ts
│   │   ├── index.ts
│   │   ├── registry.tsx
│   │   └── schemas.ts
│   ├── blocks
│   │   ├── SduiBentoBlock.tsx
│   │   ├── SduiHeroBlock.tsx
│   │   └── SduiSmartRail.tsx
│   ├── components
│   │   └── SduiRenderer.tsx
│   ├── engine
│   │   ├── BlockRegistry.tsx
│   │   └── schemas.ts
│   ├── hooks
│   │   └── useSduiLayout.ts  // Realtime cache invalidation
│   └── registry.ts
└── system-editor  // Visual SDUI Layout Editor
    └── LayoutEditorGrid.tsx  // Drag/drop layout grid

src/apps/
├── asrab  // Real Estate / Travel (placeholder)
│   └── README.md
├── khalil  // WeChat-style hub (placeholder)
│   └── README.md
├── nabd  // Health Sector (placeholder)
│   └── README.md
└── reef-al-madina  // Retail super-app (storefront)
    ├── README.md
    └── features
        ├── account
        │   ├── components
        │   │   ├── AccountActionGrid.tsx
        │   │   ├── AccountSettingRow.tsx
        │   │   ├── AccountTierCard.tsx
        │   │   ├── AccountWalletRail.tsx
        │   │   ├── HomeRedirector.tsx
        │   │   └── RoleSwitcher.tsx
        │   ├── data.ts
        │   ├── lib
        │   │   └── customerId.ts
        │   └── profile
        │       ├── components
        │       │   ├── AvatarTab.tsx
        │       │   ├── BudgetTab.tsx
        │       │   ├── IdentityTab.tsx
        │       │   ├── LifestyleTab.tsx
        │       │   ├── Primitives.tsx
        │       │   ├── ProfileHero.tsx
        │       │   ├── ProfileSaveBar.tsx
        │       │   └── ProfileTabsNav.tsx
        │       ├── data.ts
        │       ├── types.ts
        │       └── utils.ts
        ├── admin
        │   ├── components
        │   │   └── PurchaseInvoiceBuilder.tsx
        │   ├── hooks
        │   │   └── useLayoutEditor.ts
        │   ├── marketing
        │   │   ├── BannersPanel.tsx
        │   │   ├── CouponsPanel.tsx
        │   │   ├── FlashPanel.tsx
        │   │   ├── PanelErrorBoundary.tsx
        │   │   ├── shared.tsx
        │   │   └── types.ts
        │   └── product-editor
        │       ├── BasicInfoForm.tsx
        │       ├── OptionsBuilder.tsx
        │       ├── PricingAndInventory.tsx
        │       ├── SmartTagSuggester.tsx
        │       ├── SpecsForm.tsx
        │       ├── primitives.tsx
        │       └── types.ts
        ├── affiliate
        │   ├── components
        │   │   └── AffiliateDashboard.tsx
        │   └── hooks
        │       └── useAffiliateEngine.ts
        ├── cart
        │   ├── components
        │   │   ├── CartAddressSelector.tsx
        │   │   ├── CartCheckoutActions.tsx
        │   │   ├── CartCrossSellRail.tsx
        │   │   ├── CartIncentiveProgress.tsx
        │   │   ├── CartLineItem.tsx
        │   │   ├── CartLogisticsBanners.tsx
        │   │   ├── CartLoyaltyBar.tsx
        │   │   ├── CartPaymentMethods.tsx
        │   │   ├── CartPricingErrorsBanner.tsx
        │   │   ├── CartSummary.tsx
        │   │   ├── CheckoutSheet.tsx
        │   │   ├── ExclusionBadge.tsx
        │   │   ├── NumberFlow.tsx
        │   │   ├── PremiumProgressBar.tsx
        │   │   ├── RechargeDialog.tsx
        │   │   ├── SharedCartManager.tsx
        │   │   ├── SmartFakkaRail.tsx
        │   │   ├── VendorGroupCard.tsx
        │   │   └── WhatsAppFallbackDialog.tsx
        │   ├── data
        │   │   └── paymentMethods.ts
        │   ├── hooks
        │   │   ├── useCartCalculations.ts
        │   │   ├── useCartCheckoutRpc.ts
        │   │   ├── useCartIncentives.ts
        │   │   ├── useCartOrchestrator.ts
        │   │   ├── useCartValidation.ts
        │   │   ├── useCartVendorGrouping.ts
        │   │   ├── useCartWhatsApp.ts
        │   │   ├── useFakkaCalculator.ts
        │   │   ├── useSharedCartAdapter.ts
        │   │   └── useSharedCartSync.ts
        │   └── types
        │       └── cart.types.ts
        ├── driver
        │   ├── components
        │   │   ├── ActiveTasksFeed.tsx
        │   │   ├── DriverDutyToggle.tsx
        │   │   ├── DriverEarningsBar.tsx
        │   │   ├── DriverSurgeBanner.tsx
        │   │   └── TaskActionCard.tsx
        │   ├── hooks
        │   │   ├── useActiveDriverTracking.ts
        │   │   └── useDriverEngine.ts
        │   ├── store
        │   │   └── useDriverTelemetry.ts
        │   └── types
        │       └── driver.types.ts
        ├── group-buy
        │   ├── components
        │   │   ├── GroupBuyPledgeDialog.tsx
        │   │   └── GroupBuyTicker.tsx
        │   ├── hooks
        │   │   └── useGroupBuyEngine.ts
        │   └── types
        │       └── group-buy.types.ts
        ├── library
        │   ├── components
        │   │   ├── BorrowCard.tsx
        │   │   ├── BorrowSheet.tsx
        │   │   ├── BundlesGrid.tsx
        │   │   ├── KYCGateDialog.tsx
        │   │   └── PrintWizard.tsx
        │   └── data.ts
        ├── logistics
        │   ├── adapters
        │   │   └── legacyZoneToLogisticsZone.ts
        │   ├── components
        │   │   ├── AddressSheet.tsx
        │   │   └── RealMap.tsx
        │   └── hooks
        │       └── useDefaultDeliveryMethod.ts
        ├── main-hub
        │   └── components
        │       ├── DepartmentGrid.tsx
        │       ├── DynamicStoryCircles.tsx
        │       ├── MainSearchHeader.tsx
        │       ├── PromotionSlider.tsx
        │       ├── SmartGreeting.tsx
        │       └── StoryCircles.tsx
        ├── meat
        │   └── components
        │       ├── CutBuilder.tsx
        │       ├── Panel.tsx
        │       └── PrepOptions.tsx
        ├── offers
        │   ├── components
        │   │   ├── BundleDealsRail.tsx
        │   │   ├── DynamicHeroBanner.tsx
        │   │   ├── FlashSalesGrid.tsx
        │   │   ├── FulfillmentBadge.tsx
        │   │   ├── PersonalizedDealsRail.tsx
        │   │   ├── SectionOffersRail.tsx
        │   │   ├── SponsoredRestaurantRail.tsx
        │   │   └── TierExclusiveOffers.tsx
        │   ├── hooks
        │   │   ├── useDailyCountdown.ts
        │   │   └── useOffersRails.ts
        │   └── types
        │       └── rail.ts
        ├── pharmacy
        │   ├── components
        │   │   ├── CategoryRail.tsx
        │   │   ├── EmptyState.tsx
        │   │   ├── LazyImg.tsx
        │   │   ├── ProductCards.tsx
        │   │   ├── ProductOverlay.tsx
        │   │   ├── ScannerOverlay.tsx
        │   │   └── SmartBar.tsx
        │   ├── data.ts
        │   └── types.ts
        ├── pos
        │   ├── components
        │   │   ├── PosBarcodeCart.tsx
        │   │   ├── PosQuickPay.tsx
        │   │   └── PosShiftManager.tsx
        │   ├── hooks
        │   │   └── usePosEngine.ts
        │   └── types
        │       └── pos.types.ts
        ├── product-detail
        │   ├── PharmacyMedicalBlock.tsx
        │   ├── ProductGallery.tsx
        │   ├── StickyAddCTA.tsx
        │   └── VillageBlocks.tsx
        ├── recipes
        │   ├── components
        │   │   ├── DailyBrowser.tsx
        │   │   ├── RecipeModal.tsx
        │   │   └── WeeklyPlanner.tsx
        │   └── data.ts
        ├── settings
        │   ├── data.ts
        │   └── locales.ts
        ├── storefront
        │   ├── components
        │   │   └── StoreCategoryGrid.tsx
        │   └── home
        │       ├── components
        │       │   ├── BestSellersRail.tsx
        │       │   ├── BundleCard.tsx
        │       │   ├── BundlesRail.tsx
        │       │   ├── CategoriesGrid.tsx
        │       │   ├── CompareBar.tsx
        │       │   ├── DetailSheet.tsx
        │       │   ├── FiltersSheet.tsx
        │       │   ├── HeroBanner.tsx
        │       │   ├── LayoutFactory.tsx
        │       │   ├── ProductCard.tsx
        │       │   ├── ProductsGrid.tsx
        │       │   ├── RailHeader.tsx
        │       │   └── SearchAndFilters.tsx
        │       ├── dictionaries.ts
        │       ├── hooks
        │       │   ├── useHomeOrchestrator.ts
        │       │   └── useUiLayout.ts
        │       ├── mapper.ts
        │       ├── types
        │       │   └── sdui.types.ts
        │       └── types.ts
        ├── sweets
        │   └── components
        │       ├── FulfillmentSelector.tsx
        │       ├── SweetsCustomizationForm.tsx
        │       └── VariantPicker.tsx
        └── vendor
            ├── components
            │   ├── VendorInventoryGrid.tsx
            │   ├── VendorLiveOrdersFeed.tsx
            │   └── VendorSettlementDashboard.tsx
            ├── hooks
            │   ├── useVendorOperations.ts
            │   └── useVendorSettlement.ts
            └── types
                └── vendor-ops.types.ts

src/context/
├── AuthContext.tsx  // Salsabil OS National ID Provider
├── CartContext.tsx
├── CompareContext.tsx
├── FavoritesContext.tsx
├── LocaleContext.tsx
├── LocationContext.tsx
├── SharedCartContext.tsx
├── ThemeContext.tsx
└── UIContext.tsx

src/routes/
├── -lazyRoute.tsx
├── __root.tsx  // OS Gateway — wraps every app
├── _app
│   ├── account.addresses.tsx
│   ├── account.favorites.tsx
│   ├── account.help.tsx
│   ├── account.index.tsx
│   ├── account.notifications.tsx
│   ├── account.orders.tsx
│   ├── account.payments.tsx
│   ├── account.profile.tsx
│   ├── account.settings.tsx
│   ├── account.tsx
│   ├── account.verification.tsx
│   ├── affiliate.tsx
│   ├── cart.tsx
│   ├── index.tsx
│   ├── offers.tsx
│   ├── order-success.tsx
│   ├── product.$productId.tsx
│   ├── restaurant.$id.tsx
│   ├── search.tsx
│   ├── sections.tsx
│   ├── store.baskets-build.tsx
│   ├── store.baskets-subs.tsx
│   ├── store.baskets.tsx
│   ├── store.dairy.tsx
│   ├── store.home-compare.tsx
│   ├── store.home.tsx
│   ├── store.kitchen.tsx
│   ├── store.library.tsx
│   ├── store.meat.tsx
│   ├── store.pharmacy.tsx
│   ├── store.produce.tsx
│   ├── store.recipes.tsx
│   ├── store.restaurants.tsx
│   ├── store.subscription.tsx
│   ├── store.supermarket.tsx
│   ├── store.sweets.tsx
│   ├── store.village.tsx
│   ├── store.wholesale.tsx
│   ├── sub.$slug.tsx
│   └── wallet.tsx
├── _app.tsx
├── admin.$entity.$id.tsx
├── admin.$entity.tsx
├── admin.advance-approvals.tsx
├── admin.affiliate-settings.tsx
├── admin.allocation.tsx
├── admin.analytics.tsx
├── admin.audit-log.tsx
├── admin.branches.tsx
├── admin.business-rules.tsx
├── admin.cashier-sessions.tsx
├── admin.catalog-backup.tsx
├── admin.categories.tsx
├── admin.category-affinity.tsx
├── admin.cfo.tsx
├── admin.charity.tsx
├── admin.commission-ledger.tsx
├── admin.cost-bulk.tsx
├── admin.cross-branch-transfers.tsx
├── admin.customers.$customerId.tsx
├── admin.customers.tsx
├── admin.dashboard.tsx
├── admin.delivery-settings.tsx
├── admin.delivery.tsx
├── admin.delivery.zones.tsx
├── admin.design.tsx  // System Editor admin route
├── admin.discount-overrides.tsx
├── admin.driver-cash-settlements.tsx
├── admin.driver-settlements.tsx
├── admin.executive.tsx
├── admin.expenses.tsx
├── admin.finance.ledger.tsx
├── admin.finance.tsx
├── admin.hakim-anomalies.tsx
├── admin.hakim-chat.tsx
├── admin.hakim-insights.tsx
├── admin.hakim.tsx
├── admin.index.tsx
├── admin.inventory-locations.tsx
├── admin.inventory.tsx
├── admin.kyc.tsx
├── admin.low-stock.tsx
├── admin.marketing.banners.tsx
├── admin.marketing.notifications.tsx
├── admin.marketing.promos.tsx
├── admin.marketing.referrals.tsx
├── admin.marketing.tsx
├── admin.more.tsx
├── admin.offers.tsx
├── admin.orders.$orderId.tsx
├── admin.orders.index.tsx
├── admin.partner-ledgers.tsx
├── admin.partners.tsx
├── admin.payments-schedule.tsx
├── admin.payouts.tsx
├── admin.personalized-picks.tsx
├── admin.print-jobs.tsx
├── admin.product-batches.tsx
├── admin.product-units.tsx
├── admin.products.tsx
├── admin.profit-observation.tsx
├── admin.purchases.tsx
├── admin.reviews.tsx
├── admin.riba-audit.tsx
├── admin.role-permissions.tsx
├── admin.savings.tsx
├── admin.settings.tsx
├── admin.staff-advances.tsx
├── admin.staff-attendance.tsx
├── admin.staff.tsx
├── admin.store-settlements.tsx
├── admin.stores.tsx
├── admin.suppliers.tsx
├── admin.support.tsx
├── admin.system-settings.tsx
├── admin.topup-approvals.tsx
├── admin.tsx
├── admin.wallets.tsx
├── admin.zakat.tsx
├── auth.tsx
├── driver.dashboard.tsx
├── driver.index.tsx
├── driver.map.tsx
├── driver.tsx
├── driver.wallet.tsx
├── employee.tsx
├── pos.tsx
├── vendor.dashboard.tsx
├── vendor.index.tsx
├── vendor.orders.tsx
├── vendor.products.tsx
├── vendor.tsx
└── vendor.wallet.tsx

src/integrations/
└── supabase
    ├── auth-middleware.ts
    ├── client.server.ts
    ├── client.ts
    ├── portal-rpcs.ts
    └── types.ts

supabase/
├── config.toml
├── functions  // Edge functions (Hakim, Tayseer Oracle, etc.)
│   ├── generate-product-image
│   │   └── index.ts
│   ├── hakim-advisor
│   │   └── index.ts
│   ├── hakim-chat
│   │   └── index.ts
│   ├── hakim-pulse
│   │   └── index.ts
│   └── tayseer-oracle
│       └── index.ts
└── migrations
    ├── 20260427143528_25e2d4ff-0f7a-46a6-b0be-22aec7fe9bda.sql
    ├── 20260427143648_e9eed136-28a9-428d-be9f-2cc4dcc536bc.sql
    ├── 20260427150358_17c862e0-9334-47a4-82c3-dbabade73b73.sql
    ├── 20260427150417_72c8f08f-30a5-43c9-8193-b7c693a16669.sql
    ├── 20260427151849_fae5bc79-86bb-40e4-9ef0-8232eb409244.sql
    ├── 20260427151907_b1e0d66a-0993-469c-b30c-4e6aa736c15b.sql
    ├── 20260427205510_a5f2fddf-8fb9-4eed-a3a8-6d4b1aebdce4.sql
    ├── 20260428230616_21bb76a6-e303-469b-82c8-5b7bb661100d.sql
    ├── 20260429023147_e6e3f80b-bc2b-480c-9cf0-410731728fc0.sql
    ├── 20260429031040_4747d902-b60d-4587-9567-efcbb2901c49.sql
    ├── 20260429031059_247864d0-ab0d-4c2c-86a2-e735c9e677c4.sql
    ├── 20260429031531_1b8c0262-f9e7-424a-90b2-012084f31fd5.sql
    ├── 20260429160313_239fe893-499d-495c-b566-241b8cce1464.sql
    ├── 20260429162737_b01a56f4-5b30-44e8-a81a-0b0ba5f7875e.sql
    ├── 20260429162752_bf66d327-1c4f-4940-8e7a-453bd7860724.sql
    ├── 20260429165056_afcc330c-3b46-4025-b5d9-bca0f79197d8.sql
    ├── 20260429230900_19ad3bff-b02a-4029-abcf-25bf9217d135.sql
    ├── 20260429233139_30c6f4e0-ea36-4f59-9c0d-86e6d9adc026.sql
    ├── 20260430003338_ae1dd4b6-2043-4d3f-9341-5086bf4341de.sql
    ├── 20260430004955_3b0ebe1e-221f-4314-a3f2-c6e6afd782dd.sql
    ├── 20260430010109_579eeb68-4ad2-445e-8d40-75c62e97cccf.sql
    ├── 20260430012210_25cde20b-5dab-4f99-9cd6-c63136d91bef.sql
    ├── 20260430012235_ed2d9323-9271-4bd7-ac52-c2de6c6efc5a.sql
    ├── 20260430013043_0e475716-59b0-4b35-9e54-0b89365f6549.sql
    ├── 20260430015312_7d4212ac-68de-4485-9774-22d49e7acdc9.sql
    ├── 20260430020919_4b3b07a2-b82a-473c-ae37-56d33f64170d.sql
    ├── 20260430021909_1517aee8-322c-42e2-9e48-8195fed1aa0c.sql
    ├── 20260430022643_38371325-1872-456b-a05e-38ff3da4b421.sql
    ├── 20260430023947_21192ccb-07a4-4332-be71-5f58ff553551.sql
    ├── 20260430025259_e1e421b8-4b52-45bb-bda5-f8c8f2c343e1.sql
    ├── 20260430030930_c55c9df5-e64e-4f8d-9403-b487876da494.sql
    ├── 20260430032339_c7f779d6-ea74-4305-bd10-0293581edae4.sql
    ├── 20260430032934_816ffcfe-cfcb-4261-b690-4e595de7c7d6.sql
    ├── 20260430033525_346c821e-98ae-4ea9-ab3a-3423f319b6fb.sql
    ├── 20260430033858_c1dfe4c6-0dbb-4a7f-b7e6-ad30b4b10913.sql
    ├── 20260430033948_ef7b5766-5ace-4357-8f93-815c619d149c.sql
    ├── 20260430120236_af5d1e04-840b-475d-8533-802a9c87b9a5.sql
    ├── 20260430123526_5973f0fb-1ab9-40b1-b77a-f21567a7e080.sql
    ├── 20260430143408_33b969b0-5406-4a7f-91cc-8bd45928a41b.sql
    ├── 20260430152451_1f84aaa2-3f3e-4b71-aaed-6d1cf4c86160.sql
    ├── 20260501005000_71cb9409-29b9-47e0-8d80-c5c9af9e23fb.sql
    ├── 20260501133158_20f114ea-6e27-4091-ba04-41eefcc6a49b.sql
    ├── 20260501140244_a42a7b72-6a8e-4b47-ac72-b0696cc59b17.sql
    ├── 20260501145305_2444f51a-af54-4d3e-9176-976489729410.sql
    ├── 20260501150945_7c9bbab6-7aa8-4a41-a049-11d54b10f447.sql
    ├── 20260501151028_f7127c93-34c6-4d78-8bd3-e3f9f621e383.sql
    ├── 20260501151832_6fb2e5a7-b78c-4feb-bf85-4ed87944f4e4.sql
    ├── 20260501152353_d1f5f570-1888-4333-9faa-fa84383889ab.sql
    ├── 20260501153506_d5539bf4-73d7-4e51-8765-fda2724405ce.sql
    ├── 20260501154002_eaa8eef1-7c92-4772-80a4-279d3f0f68be.sql
    ├── 20260501154554_58937563-f4b0-489f-9be8-167701f5efe8.sql
    ├── 20260501162651_4f83b2a5-8361-4197-80ff-d019d8543dea.sql
    ├── 20260501163741_e92c6e72-7004-4098-ab81-59ce31a0f4ab.sql
    ├── 20260501174438_67e0f210-9356-4573-851e-d2b6b8746b7e.sql
    ├── 20260501175714_266de725-6b10-445a-9007-d3add32e018b.sql
    ├── 20260501180304_da405920-fa92-4bb6-94f9-57d9c0b195e9.sql
    ├── 20260501183209_34cf6c80-2b44-45a2-83a8-087c65e1f5f4.sql
    ├── 20260501184503_mega_seed_products.sql
    ├── 20260501185925_c9510bb2-1f96-4642-80f9-8559d2192c57.sql
    ├── 20260501190322_4810561d-df8e-4b30-ace3-a12eabdd8633.sql
    ├── 20260501190539_26412cf5-fca5-4943-9fe6-8a8116a199b2.sql
    ├── 20260501192811_be2e6b7a-f4e5-40bc-853f-3e6f5a6e169c.sql
    ├── 20260501193541_ca001279-92af-4367-a3a7-440ddfd86c77.sql
    ├── 20260501194228_1562432f-490d-44f3-8dfa-43ac6e3ed1ac.sql
    ├── 20260501194956_8198ca98-d9b9-4c77-9803-7d92e675835f.sql
    ├── 20260501204910_0bfcb725-f3a7-4275-84f2-77679968c344.sql
    ├── 20260502122110_c718d790-bdef-4ac1-a24e-d6b595e39924.sql
    ├── 20260502151226_e26e5b91-97cf-4bc0-b84d-abe0666ef6b3.sql
    ├── 20260503001046_6dcf133c-f2cf-4a61-8768-a83f766cc0a8.sql
    ├── 20260503224408_e47851fd-de48-4621-bf3c-8bd217c94544.sql
    ├── 20260504020327_4cea2270-25c9-4e81-94f1-0abf1be2f819.sql
    ├── 20260504022734_40c95329-2f7d-482d-9f37-806d545dfae4.sql
    ├── 20260504030737_b1f326a0-1eb8-4b3e-b88d-61e34615d9d7.sql
    ├── 20260504032347_28dc8a19-e508-4a5e-a5de-5d07b87ac939.sql
    ├── 20260504033326_9c4e73bc-f725-4119-af4f-f8d1963aee45.sql
    ├── 20260504083042_e48fe177-dab9-4216-9b94-1447435ba27a.sql
    ├── 20260504144116_005f2d34-3802-4084-b18b-10bc07678445.sql
    ├── 20260504145036_e16d1bcc-680b-4524-9e92-98c46347631a.sql
    ├── 20260504154434_3bad3091-29d4-4e52-9a33-b8b4b9eaf6d4.sql
    ├── 20260504154519_65cab3f8-9b47-4916-b6a1-c70fa4a971ff.sql
    ├── 20260504155218_346c963d-19d2-42f6-9655-017d8550d84b.sql
    ├── 20260504155632_e6ecba6a-6bfc-422b-982f-1e2e489c502c.sql
    ├── 20260504161903_231625b9-5a01-4a69-9e84-8ab343dcb7f2.sql
    ├── 20260504171554_25dde47a-c7f7-44a4-b407-c06f3d6feca2.sql
    ├── 20260504171617_778ada08-802c-4759-8b38-cd78505937b3.sql
    ├── 20260504194810_36e5bd41-ba32-4f76-8d3d-80ae44712dfc.sql
    ├── 20260504202718_487ff1b1-5cde-46a0-8e9a-383ec4787f3d.sql
    ├── 20260504203452_c12de8be-1794-4f9f-8057-ae29fef40365.sql
    ├── 20260504204415_7b2678c1-4d56-4709-842a-00b7fdf18eb0.sql
    ├── 20260504205706_4a791bea-2978-433e-b3ea-6901d1fad350.sql
    ├── 20260504210144_0e48d852-6fd3-4736-805c-f938e99102ae.sql
    ├── 20260504213816_846134f9-0a35-4f81-b3b8-7f18d0dad89d.sql
    ├── 20260504214855_e1e3ce4b-ea5b-4394-aaa6-d3e1e947cbcc.sql
    ├── 20260505002844_62cabe46-0009-4784-a4d4-4a5dd7f8ecde.sql
    ├── 20260506115809_c2d2d238-1066-48b9-8056-2ea36af5993e.sql
    ├── 20260506125548_393e2829-7d34-4c4c-9edf-e16e5da7f721.sql
    ├── 20260506132321_9febb610-4231-4498-9dd2-3aaba420e0a9.sql
    ├── 20260506132918_ab2dc917-455a-48e3-9cde-6ff330c6e96b.sql
    ├── 20260506133400_71ae1566-4766-4520-97e8-295e8e6541b1.sql
    ├── 20260506133650_953b10b8-f52a-488e-afd0-0e37cbc12b40.sql
    ├── 20260506134012_627fb691-1ed3-45ca-b30e-0c3a1f9508d8.sql
    ├── 20260506134235_10234d85-17d5-42f6-8ef4-abfeb0d7aca8.sql
    ├── 20260506134423_73ac7e2d-186e-4f26-a5b0-36a1261a6c8a.sql
    ├── 20260506141216_ffb4567b-2744-494e-98b0-49d1640b8e0d.sql
    ├── 20260506141355_bb43dbcc-e6fb-4795-9a70-4498a8517d05.sql
    ├── 20260506141811_edb79db9-7dcb-44bb-954d-5baf6193b047.sql
    ├── 20260506144801_776d8b4f-9d24-406d-8353-b9f654c97963.sql
    ├── 20260506152839_571002b3-18d3-4160-8d27-3513f97a5d8b.sql
    ├── 20260506194731_de903950-1747-410c-820c-70e961db4722.sql
    ├── 20260506195345_a46d48e2-bedb-487e-bbb9-3e47bdf0a994.sql
    ├── 20260506200940_9a0f59f7-699e-4c77-8ffd-2a025f1b678a.sql
    ├── 20260506204341_aa7e7e92-a344-4f8a-b35f-fd53d012ef38.sql
    ├── 20260506210552_cc1fb6b7-8cc1-4208-b432-77f950ff8333.sql
    ├── 20260506213454_3711a83c-b75b-49a1-afee-3631bd642440.sql
    ├── 20260506214406_9fe7bf57-0ca2-49b8-90c4-769afa953e78.sql
    ├── 20260506214939_138069bc-7483-4b85-a805-1308d832db87.sql
    ├── 20260506215437_ec565918-aa3c-4a71-bc9d-3e2bf2f14d4f.sql
    ├── 20260506215827_5b0c8de6-d0bc-4f2b-a1fd-e552501168fe.sql
    ├── 20260506220215_767c3749-a105-4a22-8faa-46914b6c97fd.sql
    ├── 20260506223805_fc5d8c5f-cb13-419d-816f-6631f85cdf42.sql
    ├── 20260506224414_b44eb2e5-0d50-4e84-a89e-449d74db12e0.sql
    ├── 20260506233914_c0d00ee8-f883-4bec-be01-8f4a47bdf30b.sql
    ├── 20260507001051_448a3303-cd0a-4d55-aff5-18de648717e8.sql
    └── 20260507004450_03c00ef5-58c5-4b9f-81f9-88eaad54359b.sql

```

## Family of Apps — Registry (post Phase 4.3)

Only Sovereign Super-Apps appear here. Internal Reef departments (Baskets,
Meat, Village, Pharmacy, Kitchen, Recipes, Sweets, Wholesale, Library,
Restaurants, …) are routes inside Reef Al-Madina and are surfaced via the
SDUI `departments_hub` layout — **not** the OS registry.

| App | Route | Status |
|---|---|---|
| ريف المدينة | `/` | live |
| أسراب طيبة | `/asrab` | soon |
| نبض الحياة | `/nabd` | soon |
| معين | `/maeen` | live |

Source of truth: `src/core-os/app-registry/index.ts`.
Reef internal departments source of truth: `sdui_layouts.slug = 'departments_hub'`.

**UI atom standard**: `src/components/ui/OptimizedImage.tsx` is the **mandatory** image primitive across every app and module. Raw `<img>` tags are forbidden in product/feature surfaces; legacy `LazyImg` was purged in Phase 6.
