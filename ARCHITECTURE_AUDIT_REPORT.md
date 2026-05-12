# REEFOS / Salsabil OS — Architecture Audit Report
> **Date:** 2026-05-12 · **Mode:** READ-ONLY forensic audit
> **Auditor:** Principal Systems Architect (Sovereign Code Auditor)
> **Scope:** Entire `src/` tree vs. the Stem-Cell Constitution (`docs/constitution/*`)

---

## 1. Executive Summary

The system is in a **dual-state** condition:

| Layer | Status |
|---|---|
| **Kernel (`src/core/*`)** — capabilities, sections, runtime-ui, catalog gateway, feeds, search | 🟢 **Constitution-grade.** Clean facades, schema-driven, no leakage. |
| **Domain modules `src/modules/*`** | 🟡 Partial — `search` still imports static product list. |
| **Apps & legacy presentation (`src/apps/reef-al-madina`, `src/pages`, `src/components`)** | 🔴 **Non-compliant.** 74 direct `supabase.from()` calls, 58 files importing the static `@/lib/products`, dual `HGProduct` view-model still alive across the entire storefront. |
| **Admin pages (`src/pages/admin/*`)** | 🔴 Direct Supabase CRUD — no admin gateway exists yet. |

**Verdict:** the **stem-cell core is healthy**; the **legacy outer layer never received its purification wave**. Wave 2.A/2.B were planned but not executed against the storefront and admin surfaces. The system technically *can* serve from `catalogGateway` (proven by `/runtime/$slug`), but the actual user-visible storefront (`Home`, `Meat`, `HomeGoods`, `Pharmacy`, etc.) still rides the legacy pipeline.

**Severity:** 🔴 **High architectural drift** — every additional feature shipped through the legacy pipe makes the migration heavier. Halt new feature work in `src/pages/store/*` and `src/apps/.../storefront/home/*` until Wave A executes.

---

## 2. Critical Violations (Red Flags)

### 2.1 Direct Supabase access from UI / hooks-consumed-by-UI
**Total: 74 occurrences across 28 files.** Constitution Article 3 (Universal Prohibitions): forbidden.

#### 2.1.1 Storefront / customer pages
| File | Line | Table | Severity |
|---|---|---|---|
| `src/pages/ProductDetail.tsx` | 65 | `reviews` | 🔴 Critical — must use `catalogGateway.getDetails` w/ embedded reviews aggregate |
| `src/pages/Account.tsx` | 43, 45, 48 | `wallet_balances`, `salsabil_master_orders`, `kyc_verifications` | 🔴 needs `accountGateway` |
| `src/pages/account/Profile.tsx` | 127 | `profiles` | 🔴 |
| `src/pages/account/Notifications.tsx` | 54 | `notifications` | 🔴 |
| `src/pages/account/Addresses.tsx` | 132, 133, 139 | `addresses` | 🔴 |
| `src/pages/EmployeeHub.tsx` | 35, 41, 57, 73, 91 | staff_attendance, staff_advance_requests | 🔴 |

#### 2.1.2 Admin surface (no gateway exists)
| File | Lines | Tables |
|---|---|---|
| `src/pages/admin/Stores.tsx` | 27, 35, 130, 131 | `stores` |
| `src/pages/admin/RolePermissions.tsx` | 35, 36, 64, 69 | `permissions`, `role_permissions` |
| `src/pages/admin/Categories.tsx` | 23, 31, 169, 170 | `categories` |
| `src/pages/admin/Branches.tsx` | 36, 48, 61 | `branches` |
| `src/pages/admin/Notifications.tsx` | 59, 74 | `profiles`, `notifications` |
| `src/pages/admin/AdvanceApprovals.tsx` | 29, 38 | `staff_advance_requests` |
| `src/pages/admin/CustomerDetail.tsx` | 112–115 | `profiles`, `wallet_balances`, orders |
| `src/pages/admin/BusinessOpsDashboard.tsx` | 140 | `salsabil_assets` |

#### 2.1.3 Reef-al-Madina feature modules
| File | Lines | Tables |
|---|---|---|
| `src/apps/reef-al-madina/features/cart/hooks/useCartOrchestrator.ts` | 129, 536 | `profiles`, `cart_items` |
| `src/apps/reef-al-madina/features/cart/hooks/useSharedCartSync.ts` | 137–139, 361, 389 | `shared_carts*` |
| `src/apps/reef-al-madina/features/library/sections/SchoolLibrarySection.tsx` | 35 | `kyc_verifications` |
| `src/apps/reef-al-madina/features/library/components/PrintWizard.tsx` | 59 | `print_jobs` |
| `src/apps/reef-al-madina/features/group-buy/hooks/useGroupBuyEngine.ts` | 67, 68 | `group_buy_*` (with `as never` cast — schema bypass!) |
| `src/apps/reef-al-madina/features/driver/hooks/useActiveDriverTracking.ts` | 106 | `driver_positions` |
| `src/apps/reef-al-madina/features/driver/store/useDriverTelemetry.ts` | 43 | `driver_positions` |
| `src/apps/reef-al-madina/features/admin/marketing/{FlashPanel,CouponsPanel,BannersPanel}.tsx` | many | `as never` casts everywhere |
| `src/apps/reef-al-madina/features/admin/components/PurchaseInvoiceBuilder.tsx` | 65 | `suppliers` |

#### 2.1.4 Core-OS leakage
| File | Lines |
|---|---|
| `src/core-os/capabilities/identity/KycUpgradeGate.tsx` | 90, 99 — UI mutation of `profiles` |
| `src/core-os/finance/hooks/useGameyas.ts` | 174 |
| `src/core-os/sdui-engine/admin/hooks/useEntityDefinition.ts` | 62, 64 |
| `src/core-os/sdui-engine/admin/blocks/MapCanvas.tsx` | 50 |
| `src/core-os/system-editor/hooks/useLayoutEditor.ts` | 228 |
| `src/components/hakim/FloatingGuardian.tsx` | 82, 159 (also uses `as never` cast — Article 3 violation) |

> 🚨 **Pattern of `(supabase.from("…" as never) as unknown as …)` casts** in marketing panels, group-buy, hakim guardian — these silently bypass the generated Supabase types. This is **Article 3** ("`any` types / `as` casts that bypass validation") and should be treated as a security-class bug.

### 2.2 Dual Source of Truth — Legacy `@/lib/products` still feeding 58 files
The static array in `src/lib/products.ts` is imported by **58 files**, including:
- `src/store/useCartStore.ts` (cart resolves products from the static list)
- `src/modules/search/hooks/useUniversalSearch.ts` (search bypasses `searchRegistry`)
- `src/components/ProductCard.tsx`, `src/components/ProductCarousel.tsx`, `src/components/SinglePageStore.tsx`
- `src/components/baskets/*`, `src/components/meat/ButcherSheet.tsx`, `src/components/sweets/SweetsProductSheet.tsx`, `src/components/kitchen/MealSheet.tsx`
- All cart hooks (`useCartCalculations`, `useCartVendorGrouping`, `useCartWhatsApp`, `useSharedCartAdapter`)
- All offers components (`SectionOffersRail`, `FlashSalesGrid`, `PersonalizedDealsRail`, `SponsoredRestaurantRail`)
- `src/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator.ts` (Home)
- Pharmacy: `src/apps/reef-al-madina/features/pharmacy/data.ts` runs its own `useProductsBySourceQuery`, *not* `catalogGateway.listSection`.

**Result:** every page reads from a different "truth": some from the static array, some from a per-feature Supabase query, some from `catalogGateway`. Pricing, badges, capabilities, and inventory diverge per page.

### 2.3 Hardcoded Slugs / Section Branching
| File | Line | Pattern |
|---|---|---|
| `src/pages/store/HomeGoods.tsx` | 21 | `getSectionIdentity("home-goods")!` — hardcoded slug + non-null bang |
| `src/pages/store/Meat.tsx` | 4 | hardcoded `themeKey="meat"`, `pageKey="category_meat"`, Arabic title literal |
| `src/apps/reef-al-madina/features/recipes/components/DailyBrowser.tsx` | 26 | `r.section === activeMeal` filter |
| `src/apps/reef-al-madina/features/recipes/components/WeeklyPlanner.tsx` | 59 | `RECIPES.filter((r) => r.section === s)` — both reads from static `RECIPES` array |
| `src/pages/store/*` | (all) | One `.tsx` page **per section** — the very existence of `Meat.tsx`, `Dairy.tsx`, `Pharmacy.tsx`, `Sweets.tsx`, `Recipes.tsx`, `HomeGoods.tsx`, etc. is structural drift (Article 5: routes should be `/section/$slug` driven by `SectionRegistry`). |

### 2.4 Legacy `HGProduct` view-model still pollutes the storefront
The kernel ships the canonical `ProductCardVM` / `ProductDetailsVM`, yet 11+ files still consume `HGProduct`:
- `home/types.ts`, `home/mapper.ts` (`productToHGView`) — a *second* mapper after `ProductRuntimeEngine`
- `home/hooks/useHomeOrchestrator.ts` (catalog/filtered/bestSellers/opened all typed as `HGProduct`)
- `home/components/{ProductCard,ProductsGrid,BundlesRail,BundleCard,BestSellersRail,DetailSheet}.tsx`

This is the **dual-VM** problem: even after a row leaves `catalogGateway`, the storefront immediately re-maps it into a legacy shape, defeating the whole point of the runtime VM.

### 2.5 Capability / RuntimeRenderer bypass
- **Zero** files outside `/src/routes/runtime/$slug.tsx` import `RuntimeRenderer` or call `blockRegistry.get/register`. The runtime engine is **dead code in production paths**.
- Storefront pages render bespoke React trees (`<ProductsGrid />`, `<BundlesRail />`, …) instead of `<RuntimeRenderer descriptor={resolveListTree(...)} />`.
- Capabilities are present (`CapabilityRegistry`) but **never consulted by storefront UI** — visibility of "nutrition", "wholesale", "addons" panels is hardcoded per component instead of derived from `section.capabilities`.

---

## 3. Architectural Debt (Page-Centric vs. Capability-Centric)

| Smell | Evidence | Constitutional clause violated |
|---|---|---|
| **One page per section** | `src/pages/store/{Meat,Dairy,Sweets,Pharmacy,Produce,Kitchen,HomeGoods,Recipes,Restaurants,Wholesale,Subscriptions,Baskets,SchoolLibrary,Village}.tsx` | Article 2 — Runtime over Hardcoding |
| **Per-section components** | `src/components/{meat,sweets,kitchen,baskets,restaurants}/...` | Same |
| **Capability flags hardcoded per page** instead of resolved from `section.capabilities` | `useHomeOrchestrator` filters/sorts hardcoded; pharmacy has its own `useProductsBySourceQuery` | CAPABILITY_SYSTEM.md |
| **Dual mapper layer** (`ProductRuntimeEngine` → `productToHGView`) | `home/mapper.ts` | KERNEL_MINIMALISM.md (no policy in app shell) |
| **Search bypasses SearchRegistry** | `src/modules/search/hooks/useUniversalSearch.ts` reads from static `@/lib/products` | RUNTIME_SCHEMA_SPEC.md |
| **Pricing on legacy `Product`** | `src/core/engine/pricing/strategies/{Sweets,Meat}PricingStrategy.ts` import `@/lib/products` types | Article 9 — Single Source of Truth |
| **No admin gateway** | `src/pages/admin/*` does direct CRUD | SUPABASE_SOVEREIGNTY.md |
| **Cart store hydrated from static catalog** | `src/store/useCartStore.ts` imports `@/lib/products` | Article 9 |
| **`as never` schema bypass** | `marketing/*Panel.tsx`, `group-buy`, `hakim/FloatingGuardian.tsx` | Article 3 |

---

## 4. Purification Action Plan

A 5-wave migration. Each wave is mergeable independently and does not regress the previous.

### Wave P-0 — Guardrails (1 PR, no behavior change)
1. Add `eslint-plugin-boundaries` config:
   - `src/components/**`, `src/pages/**`, `src/apps/**` ⛔ may not import from `@/integrations/supabase/client`.
   - `src/**` ⛔ may not import from `@/lib/products` (allow-list current 58 files, fail on additions).
2. Runtime DEV-only assert in `@/integrations/supabase/client.ts`: warn if `from()` is called outside `src/core/**`, `src/routes/api/**`, or `*.functions.ts`.
3. Snapshot the 74 supabase-from sites + 58 lib/products importers as a **frozen baseline file** (`docs/audit/legacy-baseline.json`); CI fails if either count grows.

### Wave P-A — Kill `HGProduct` (storefront purity)
1. Refactor `home/components/{ProductCard,ProductsGrid,BundlesRail,BundleCard,BestSellersRail,DetailSheet,QuickMealsRail}.tsx` to consume `ProductCardVM[]` / `ProductDetailsVM` directly.
2. Delete `home/mapper.ts` (`productToHGView`) and the `HGProduct` type from `home/types.ts`.
3. Make `useHomeOrchestrator` call only `catalogGateway.listSection`, `catalogGateway.trending`, `catalogGateway.offers` — remove all `Product` typing.

### Wave P-B — One static-catalog killer
1. Replace `useUniversalSearch` body with `searchRegistry.get().search()`.
2. Replace `useCartStore` product resolution: store only `productId + variantId`; resolve display via `catalogGateway.getDetails` on demand (cached via React Query).
3. Replace `pharmacy/data.ts::useProductsBySourceQuery` with `catalogGateway.listSection({ slug: 'pharmacy' })`.
4. Migrate `useBuyAgainProducts`, `useInfiniteCatalog`, `useProductsQuery` to gateway.
5. Migrate every component currently importing `@/lib/products` to `ProductCardVM` (batch by sub-folder: `baskets/*`, `sweets/*`, `meat/*`, `kitchen/*`, `restaurants/*`, `store/*`).
6. Convert `core/engine/pricing/strategies/*` to operate on `ProductCardVM`/`ProductDetailsVM` (or pure pricing inputs) — never legacy `Product`.
7. Delete `src/lib/products.ts` (or reduce to a re-export of `ProductCardVM` test fixtures only).

### Wave P-C — Collapse pages into runtime routes
1. Replace `src/pages/store/{Meat,Dairy,Sweets,Pharmacy,Produce,Kitchen,HomeGoods,Recipes,Wholesale,Subscriptions,Baskets,SchoolLibrary,Village}.tsx` with a **single** route file:
   ```
   src/routes/store.$slug.tsx
     → const tree = await resolveListTree(slug, vmList)
     → <RuntimeRenderer descriptor={tree} />
   ```
2. Refactor `ProductDetail.tsx` to:
   ```
   const tree = resolveDetailsTree(details)
   <RuntimeRenderer descriptor={tree} />
   ```
   Remove the `supabase.from("reviews")` call — fold reviews aggregate into `getProductDetailsFn`.
3. Convert section-specific atoms (`ButcherSheet`, `MealSheet`, `SweetsProductSheet`, `BasketSheet`, …) into **registered blocks** in `blockRegistry` keyed by `section.capabilities` — never by hardcoded section slug.

### Wave P-D — Admin & ops gateway
1. Create domain gateways: `adminCatalogGateway`, `marketingGateway`, `staffGateway`, `branchesGateway`, `notificationsGateway`, `groupBuyGateway`, `driverTelemetryGateway`.
2. Move all `supabase.from()` calls from `src/pages/admin/*`, `src/apps/.../admin/*`, `src/apps/.../driver/*`, `src/apps/.../group-buy/*`, `src/apps/.../cart/hooks/useSharedCartSync.ts` into the corresponding gateway as `createServerFn` handlers with Zod validators.
3. Eliminate every `(supabase.from("…" as never) as unknown as …)` cast — generate proper types or expose typed RPCs.
4. Forbid `supabase.from()` outside `src/core/**` and `*.functions.ts` via the eslint rule (flip from warn → error).

### Wave P-E — Capability-driven UX & event spine
1. Wire `capabilityRegistry.has(section, CAP.X)` into every conditional block (filters, addons, nutrition, wholesale tiers, family mode) — remove all `if (section === "…")` branches.
2. Make every cart / order / wallet mutation emit a typed event (per `EVENT_SYSTEM.md`); UI projections subscribe instead of imperatively re-fetching.
3. Wrap `ProductDetail` reviews, `useGameyas`, `KycUpgradeGate` writes through events + gateway.

### Exit criteria (Constitution-green build)
- `rg "supabase\.from\(" src/{pages,components,apps,modules,core-os,features,hooks,store}` → **0 hits**.
- `rg "from ['\"]@/lib/products['\"]" src` → **0 hits**.
- `rg "HGProduct" src` → **0 hits**.
- `rg "as never\)" src` → **0 hits**.
- All storefront routes render via `<RuntimeRenderer />`.
- `eslint-plugin-boundaries` passes with `error` level.
- CI baseline file deleted (no legacy left to baseline).

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cart desync during P-B (store drops static product) | High | High | Ship gateway-resolved cart behind a feature flag; dual-write for one release. |
| Admin pages break during P-D rewrite | Medium | Medium | Build gateways alongside legacy, switch per page, keep RLS untouched. |
| Hidden coupling via `as never` casts (group-buy, hakim) | High | High | Generate types first; failures will surface as compile errors — fix one by one. |
| Pricing regressions when retiring `Product` (P-B step 6) | Medium | High | Extend `core/engine/pricing/__tests__/*` to cover the VM shape *before* deleting legacy types. |

---

## 6. Closing Statement

The kernel is constitutional. The crust is not. The single most valuable next action is **Wave P-0 (guardrails)** — without it, every new PR continues to widen the legacy footprint. After guardrails are in, Waves A → B → C → D → E can proceed in order with no further cross-team coordination, because each wave reduces the visible surface of the previous violation set.

> *"A faster path that violates a boundary is a regression, not a feature."* — `SYSTEM_CONSTITUTION.md` §1.1
