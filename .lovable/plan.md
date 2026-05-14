# Wave P-3 Final Sweep — Batched Execution Plan

The straggler scan returned **75 files** (not a handful as the audit implied). Refactoring them all in one turn would compromise correctness: each hook has its own state machine, each component its own data shape, and a single mis-typed `as` cast or stray supabase reference breaks `tsc --noEmit`. I propose splitting the Final Sweep into **6 focused mini-waves**, each producing a fresh "Sovereign Post-Flight Report" and a clean compile, before moving on.

## Categorization of the 75 files

### A. Architecturally exempt — server functions (7 files)
TanStack `*.functions.ts` modules run server-side via `createServerFn`. They **are** the sovereign boundary for their domain (server-side gateway equivalent). The Constitution's Article 2 targets client-side direct calls.

- `src/core/sections/sections.functions.ts`
- `src/lib/library.functions.ts`
- `src/core/catalog/service/catalog.functions.ts`
- `src/lib/hr.functions.ts`
- `src/lib/section-manager.functions.ts`
- `src/core/capabilities/capabilities.functions.ts`
- `src/lib/marketing.functions.ts`

**Action:** flag as compliant-by-architecture, no extraction.

### B. Dev-only seed script (1 file)
- `src/lib/megaSeed.ts` — flag, leave untouched per orders unless imported by UI (verify in batch 6).

### C. Sub-Wave 8 — Hakim AI family (10 files)
New `HakimGateway.ts`.
- `src/hooks/useHakimPulse.ts`, `src/features/hakim/hooks/useHakimPulse.ts`
- `src/hooks/useHakimChatStream.ts`
- `src/core/hakim-ai/hooks/useUpdateUSA.ts`, `useAssetMatchmaker.ts`, `usePredictBasket.ts`, `useAestheticProcessor.ts`, `useMintUSA.ts`, `useInventoryMatrix.ts`, `useHakimEdgeWorker.ts`, `useFulfillmentNodes.ts`
- `src/core/hakim-ai/components/HakimPulseMonitor.tsx`

### D. Sub-Wave 9 — Runtime UI / SDUI / Admin Editor family (12 files)
New `RuntimeUIGateway.ts` (or extend existing).
- `src/core/runtime-ui/watchdog.bootstrap.ts`
- `src/core/runtime-ui/system-editor/hooks/useLayoutEditor.ts`
- `src/core/runtime-ui/sdui/hooks/useSduiLayout.ts`, `engine/SduiWatchdog.ts`, `blocks/offers/SduiOfferNeighborhoodPool.tsx`
- `src/core/runtime-ui/admin/hooks/useSchemaRollback.ts`, `useEntityRecord.ts`, `useEntityMutation.ts`, `useEntityList.ts`, `useEntityDefinition.ts`, `useAdminNavigation.ts`, `useAdminAction.ts`, `blocks/MapCanvas.tsx`
- `src/apps/reef-al-madina/features/admin/usa-editor/USAEditor.tsx`
- `src/apps/reef-al-madina/features/storefront/home/hooks/useUiLayout.ts`

### E. Sub-Wave 10 — Finance UI components residual (10 files)
Extend `FinanceGateway.ts`.
- `src/components/finance/WithdrawDialog.tsx`, `WalletSavingsJars.tsx`, `WalletCharityHub.tsx`, `WalletAnalytics.tsx`, `WalletAffiliateHub.tsx`, `JoinGameyaSheet.tsx`, `VaultsGrid.tsx`, `GameyaCreationSheet.tsx`, `NetWorthCard.tsx`
- `src/apps/reef-al-madina/features/vendor/components/SovereignSettlementsPanel.tsx` (extend `VendorGateway`)

### F. Sub-Wave 11 — Cart/Catalog/Offers/POS/KDS leftovers (11 files)
Extend `CartGateway`, `MarketingGateway`, new `CatalogGateway` + `PosGateway` + `KdsGateway`.
- `src/hooks/useProductsQuery.ts`, `src/lib/sovereignCatalog.ts`, `src/lib/saved-bundles.ts`, `src/core/catalog/hooks/useSectionSubcategories.ts`
- `src/apps/reef-al-madina/features/cart/hooks/useSharedCartSync.ts`, `useCartValidation.ts`, `useCartVendorGrouping.ts`
- `src/apps/reef-al-madina/features/offers/hooks/useOffersRails.ts`
- `src/apps/reef-al-madina/features/pos/hooks/usePosEngine.ts`
- `src/apps/reef-al-madina/features/kds/hooks/useKdsEngine.ts`
- `src/modules/search/components/RequestProductForm.tsx`

### G. Sub-Wave 12 — System/Identity/Theme/Logistics/Observability tail (15 files)
Extend `IdentityGateway`, `DriverGateway`; new `SystemGateway`, `ObservabilityGateway`, `ThemeGateway`.
- `src/hooks/useGeoZones.ts`, `src/hooks/useSystemSettings.ts`
- `src/components/system/SalsabilStatusBar.tsx`
- `src/core/theme/hooks/useSovereignTheme.ts`, `src/context/ThemeContext.tsx`, `src/context/FavoritesContext.tsx`
- `src/lib/sovereignTracing.ts`, `src/lib/behavior.ts`, `src/lib/offlineSyncQueue.ts`, `src/lib/queryPersister.ts`
- `src/core/maeen/useActiveDelivery.ts`, `src/core/logistics/useSmartLogistics.ts`
- `src/core/events/useTrackBehavior.ts`
- `src/core/engine/pricing/config/useLiveRules.ts`
- `src/core/capabilities/identity/KycUpgradeGate.tsx`

### H. Sub-Wave 13 — Routes (4 files)
Routes typically delegate to hooks; extract their inline calls into the appropriate existing gateway.
- `src/routes/_dispatch.dispatch.tsx`
- `src/routes/_barq.tsx`, `src/routes/_barq.driver-ops.tsx`
- `src/routes/_app/wallet.tsx`

## Why batched, not bulk

- Each sub-wave finishes with `rg` + `tsc --noEmit` proof, matching the discipline established across sub-waves 1–7.
- Bulk-rewriting 75 files in one shot risks (a) introducing silent type drift hidden by `as any` casts, (b) breaking the build mid-flight with no recovery checkpoint, (c) generating an incoherent post-flight report.
- Each batch maps cleanly to one domain → one gateway, preserving the architecture established in earlier sub-waves.

## Deliverable per sub-wave

For each batch I will produce:
1. New/extended Gateway file under `src/core/<domain>/gateway/`.
2. All target files purified.
3. `rg "@/integrations/supabase/client"` over the batch → zero hits.
4. `bunx tsc --noEmit` → clean.
5. Sovereign Post-Flight Report listing files purified + anomalies flagged for Wave P-7.

## Approval

Confirm to begin **Sub-Wave 8 (Hakim AI family)**, or reorder the batches if a different domain is more urgent.
