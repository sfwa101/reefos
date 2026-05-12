# Bespoke Tools & Ops Blueprint — Wave P-D

> **Status:** Reconnaissance · Read-Only Audit · No code mutated.
> **Authority:** `SYSTEM_CONSTITUTION.md` Articles 3 + 11 · `PURIFICATION_BASELINE.md` C1 + C4 ratchets.
> **Mandate:** Drive **C1 (`ui_supabase_from_calls`) → 0** by routing every UI-layer Supabase call through a sanctioned `createServerFn` / Gateway, and drive **C4 → 0** by collapsing the 3 deferred bespoke routes (`BasketsBuild`, `BasketsSubs`, `CompareHomeGoods`) into declarative `RuntimeRenderer` blocks served by `store.$slug.tsx`.

This document is the **migration plan**. It does **not** change any source. Implementation lands in subsequent D-x steps.

---

## 0. Drift Note vs. P-0 Baseline

P-0 froze C1 at **74**. The post-Wave-P-C live count of files containing the literal `supabase.from(` under the C1 scope (`src/components/**`, `src/pages/**`, `src/apps/**`, `src/hooks/**`, `src/modules/**`, excluding `src/integrations/supabase/**` and `*.functions.ts`) is **26 files / 66 occurrences**. The drop from 74 → 26 was an unrecorded side-effect of route deletions in Waves P-C/C-4 (groups α, β, γ pages were removed wholesale and many of them carried admin-style direct DB reads). Wave P-D's first commit MUST append a P-0→P-D-START reconciliation row to `PURIFICATION_BASELINE.md` §4 setting C1 = 26 before the first migration step.

---

## 1. Inventory — C1 (26 files)

### Domain map

| # | Domain | File | Tables touched | Mutations | Notes |
|---|---|---|---|---|---|
| 1 | **User account** | `src/pages/account/Profile.tsx` | `profiles` | upsert | Read+write current user profile. |
| 2 | User account | `src/pages/account/Addresses.tsx` | `addresses` | insert/update/delete | CRUD list. |
| 3 | User account | `src/pages/account/Notifications.tsx` | `notifications` | mark-read | List + unread toggle. |
| 4 | User account | `src/pages/Account.tsx` | `kyc_verifications`, `salsabil_master_orders`, `wallet_balances` | read | Hub aggregate. |
| 5 | **Cart / Checkout** | `src/apps/.../cart/hooks/useCartOrchestrator.ts` | `cart_items`, `profiles` | upsert/update | Cart hydration + sync. |
| 6 | Cart / Checkout | `src/apps/.../cart/hooks/useSharedCartSync.ts` | `shared_carts`, `shared_cart_items`, `shared_cart_participants` | full CRUD | Realtime shared cart. |
| 7 | **Catalog · PDP** | `src/pages/ProductDetail.tsx` | `reviews` | read | Reviews tab read. |
| 8 | **Bespoke tools** | `src/apps/.../library/components/PrintWizard.tsx` | `print_jobs` | insert | Library print queue. |
| 9 | Bespoke tools | `src/apps/.../library/sections/SchoolLibrarySection.tsx` | `kyc_verifications` | read | KYC gate display. |
| 10 | **Driver / Logistics** | `src/apps/.../driver/hooks/useActiveDriverTracking.ts` | `driver_positions` | read (live) | Realtime tracking. |
| 11 | Driver / Logistics | `src/apps/.../driver/store/useDriverTelemetry.ts` | `driver_positions` | upsert | Driver position publisher. |
| 12 | **Group-buy** | `src/apps/.../group-buy/hooks/useGroupBuyEngine.ts` | `group_buy_campaigns`, `group_buy_tiers` | read | Campaign hydration. |
| 13 | **Hakim (AI ops)** | `src/components/hakim/FloatingGuardian.tsx` | `hakim_user_insights` | read+insert | Personalized nudges. |
| 14 | **Employee / HR** | `src/pages/EmployeeHub.tsx` | `staff_advance_requests`, `staff_attendance` | read+insert | Self-service HR. |
| 15 | Employee / HR | `src/pages/admin/AdvanceApprovals.tsx` | `staff_advance_requests`, `profiles` | read+update | Manager approvals. |
| 16 | **Admin · Catalog** | `src/pages/admin/Categories.tsx` | `categories` | full CRUD | Master data. |
| 17 | Admin · Catalog | `src/pages/admin/Stores.tsx` | `stores` | full CRUD | Master data. |
| 18 | Admin · Catalog | `src/pages/admin/Branches.tsx` | `branches` | full CRUD | Master data. |
| 19 | Admin · Catalog | `src/apps/.../admin/components/PurchaseInvoiceBuilder.tsx` | `suppliers` | read | Picker. |
| 20 | **Admin · Marketing** | `src/apps/.../admin/marketing/BannersPanel.tsx` | (banners) | full CRUD | 5 calls. |
| 21 | Admin · Marketing | `src/apps/.../admin/marketing/CouponsPanel.tsx` | (coupons) | full CRUD | 5 calls. |
| 22 | Admin · Marketing | `src/apps/.../admin/marketing/FlashPanel.tsx` | (flash sales) | upsert/delete | 3 calls. |
| 23 | **Admin · CRM** | `src/pages/admin/CustomerDetail.tsx` | `profiles`, `salsabil_master_orders`, `wallet_balances` | read | 360° view. |
| 24 | Admin · CRM | `src/pages/admin/Notifications.tsx` | `notifications`, `profiles` | broadcast insert | Mass send. |
| 25 | **Admin · Auth/Roles** | `src/pages/admin/RolePermissions.tsx` | `permissions`, `role_permissions` | full CRUD | RBAC matrix. |
| 26 | **Admin · BI** | `src/pages/admin/BusinessOpsDashboard.tsx` | `salsabil_assets` | read | KPI tile. |

### Domain rollup

| Domain | Files | Total `from(` |
|---|---:|---:|
| User account (self-service) | 4 | 8 |
| Cart / Checkout / Shared-cart | 2 | 7 |
| Catalog (PDP reviews) | 1 | 1 |
| Bespoke tools (Library) | 2 | 2 |
| Driver / Logistics realtime | 2 | 2 |
| Group-buy | 1 | 2 |
| Hakim AI ops | 1 | 2 |
| Employee / HR | 2 | 7 |
| Admin · Catalog master-data | 4 | 12 |
| Admin · Marketing | 3 | 13 |
| Admin · CRM | 2 | 5 |
| Admin · Auth/Roles | 1 | 4 |
| Admin · BI | 1 | 1 |
| **Total** | **26** | **66** |

---

## 2. Gateway / Server-Function Mapping

The kernel today exposes one `catalogGateway` (read-side, public). Wave P-D introduces **eight** new domain gateways, each backed by `createServerFn` handlers. All handlers live under `src/lib/<domain>.functions.ts` (client-safe import path) with `*.server.ts` siblings for admin clients (per `tanstack-supabase-import-graph`). RLS is enforced by `requireSupabaseAuth` middleware; admin-only mutations gate on `has_role(auth.uid(), 'admin')` in DB or via a new `requireAdmin` middleware composed on top of `requireSupabaseAuth`.

### 2.1 Gateway map

| Gateway | Files served | Server-fn module | Required server fns (read / write) |
|---|---|---|---|
| **userGateway** | account/Profile, account/Addresses, account/Notifications, Account hub, FloatingGuardian | `src/lib/user.functions.ts` | `getMyProfile`, `updateMyProfile`, `listMyAddresses`, `upsertAddress`, `deleteAddress`, `listMyNotifications`, `markNotificationRead`, `getMyAccountHub` (KYC + orders summary + wallet), `recordHakimInsight`, `getHakimInsights` |
| **cartGateway** | cart/useCartOrchestrator, cart/useSharedCartSync | `src/lib/cart.functions.ts` (auth-protected) + `realtime` channel helper in `src/lib/cart.realtime.ts` | `hydrateCart`, `upsertCartItem`, `clearCart`, `createSharedCart`, `joinSharedCart`, `upsertSharedCartItem`, `leaveSharedCart` |
| **catalogGateway** *(extend)* | ProductDetail (reviews) | extend `src/core/catalog/gateway/catalogGateway.ts` + `src/lib/catalog.functions.ts` | `listProductReviews(productId)` |
| **libraryGateway** | PrintWizard, SchoolLibrarySection | `src/lib/library.functions.ts` | `submitPrintJob`, `getMyKycStatus` |
| **driverGateway** | useActiveDriverTracking, useDriverTelemetry | `src/lib/driver.functions.ts` (+ realtime channel for live positions, no DB write from UI) | `publishDriverPosition`, `subscribeOrderTracking` (returns realtime channel config; client opens channel via browser client) |
| **groupBuyGateway** | useGroupBuyEngine | `src/lib/group-buy.functions.ts` | `listGroupBuyCampaigns`, `getGroupBuyCampaign` |
| **hrGateway** | EmployeeHub, AdvanceApprovals | `src/lib/hr.functions.ts` | `getMyAdvanceRequests`, `submitAdvanceRequest`, `clockInOut`, *(admin)* `listPendingAdvances`, `approveAdvance`, `rejectAdvance` |
| **adminCatalogGateway** | admin/Categories, admin/Stores, admin/Branches, PurchaseInvoiceBuilder | `src/lib/admin-catalog.functions.ts` (admin-gated) | `listCategories`, `upsertCategory`, `deleteCategory`, `listStores`, `upsertStore`, `deleteStore`, `listBranches`, `upsertBranch`, `deleteBranch`, `listSuppliers` |
| **marketingGateway** | BannersPanel, CouponsPanel, FlashPanel | `src/lib/marketing.functions.ts` (admin-gated) | `listBanners`, `upsertBanner`, `deleteBanner`, `listCoupons`, `upsertCoupon`, `deleteCoupon`, `listFlashSales`, `upsertFlashSale`, `deleteFlashSale` |
| **crmGateway** | admin/CustomerDetail, admin/Notifications, admin/BusinessOpsDashboard | `src/lib/crm.functions.ts` (admin-gated) | `getCustomer360(userId)`, `listNotifications`, `broadcastNotification`, `getOpsKpis` |
| **rbacGateway** | admin/RolePermissions | `src/lib/rbac.functions.ts` (admin-gated) | `listPermissions`, `listRolePermissions`, `togglePermission` |

### 2.2 Middleware

- `requireSupabaseAuth` — already present; baseline for all user-scoped fns.
- **NEW** `requireAdmin` (composed) — calls `requireSupabaseAuth`, then asserts `has_role(userId, 'admin')` via the existing user_roles RPC. Lives in `src/integrations/supabase/admin-middleware.ts`. Used by every gateway marked *admin-gated* above.

### 2.3 React-Query convention

Each gateway exports a sibling `*.queries.ts` containing `queryOptions` factories (mirroring `catalogQueries.ts`) so consumers swap from `supabase.from(...).select(...)` + `useEffect`/`useState` to `useQuery(userKeys.profile())` etc. This is non-negotiable to keep cache invalidation centralized.

---

## 3. Deferred C4 Routes — Block Conversion

Three bespoke pages remain after Wave P-C. None of them belongs in `store.$slug.tsx` directly; they all collapse into existing `commerce.*` block kinds rendered through `RuntimeRenderer`, served by **the same** dynamic `store.$slug.tsx` route already live, gated on capability flags in `SECTION_IDENTITY_REGISTRY`.

### 3.1 BasketsBuild → `commerce.basket_builder`

- **File:** `src/pages/store/BasketsBuild.tsx` (236 LoC) · route `store.baskets-build.tsx`.
- **Deconstruction:**
  - Pool source = `useProductsBySourceQuery(["produce","dairy","village","supermarket"])` (replaces `products.filter(...)`).
  - Tier math = `tierForSubtotal` / `nextTierForSubtotal` from `src/lib/baskets.ts` — already capability-pure, KEEP.
  - UI = category chips + qty stepper grid + sticky cart preview + checkout CTA.
- **New block:** `commerce.basket_builder` registered in `registerCoreBlocks`. Props:
  ```ts
  { sources: string[]; thresholds: BuildBoxThreshold[]; checkoutLabel: string }
  ```
- **Resolver:** `resolveSectionTree` adds a branch when `identity.layoutVariant === "basket-builder"`. The `baskets-build` slug becomes a registered identity (`SECTION_IDENTITY_REGISTRY["baskets-build"]`).
- **Route:** delete `store.baskets-build.tsx`; URL collapses to `/store/baskets-build` served by `store.$slug.tsx`.

### 3.2 BasketsSubs → `commerce.subscription_manager`

- **File:** `src/pages/store/BasketsSubs.tsx` (170 LoC) · route `store.baskets-subs.tsx`.
- **Deconstruction:**
  - Data: `useSubscriptions()` (already a clean hook; touches no `supabase.from(...)` inside the page) — KEEP.
  - UI = subscription cards + pause/resume/skip/delete actions + savings hero.
- **New block:** `commerce.subscription_manager`. Props:
  ```ts
  { themeKey: StoreThemeKey; lockWindowHours: number }
  ```
- **Identity:** `SECTION_IDENTITY_REGISTRY["baskets-subs"]` with `layoutVariant: "subscription-manager"`.
- **Route:** delete `store.baskets-subs.tsx`.

### 3.3 CompareHomeGoods → `commerce.compare_grid` (full-page variant of `commerce.compare_bar`)

- **File:** `src/apps/.../features/compare/components/CompareHomeGoodsSection.tsx` (292 LoC) · route `store.home-compare.tsx`.
- **Deconstruction:**
  - Data: `useCompare()` from `CompareContext` — KEEP, generic.
  - Slug literal `source: "home"` cast in the Add-to-cart payload is the ONLY vertical leak — replace with the active `SectionIdentity.slug` from the route param.
- **New block:** `commerce.compare_grid` (table-style comparison, distinct from the floating `commerce.compare_bar` already shipped in P-C). Props derive from the section identity (title, themeKey).
- **Identity:** add a `home-compare` identity that aliases `home-goods` capability set + `layoutVariant: "compare-grid"`.
- **Route:** delete `store.home-compare.tsx`.

After D-3, **C4 = 0** and `store.$slug.tsx` is the sole vertical route.

---

## 4. Phased Execution Plan (Zero Regression)

> Each phase ships independently, leaves the build green, and only the final step deletes legacy.

### Phase D-0 — Baseline reconciliation (read-only)
- Append a P-0→P-D-START row to `PURIFICATION_BASELINE.md` §4 setting C1 = 26 (drift correction; no code change).
- Add `requireAdmin` middleware skeleton to `src/integrations/supabase/admin-middleware.ts` — additive, no consumers yet.

### Phase D-1 — User-account gateway (8 occurrences, 4 files)
- Build `userGateway` + `user.functions.ts` + `user.queries.ts`.
- Migrate `account/Profile`, `account/Addresses`, `account/Notifications`, `Account.tsx`, `FloatingGuardian.tsx`.
- **C1 ratchet target:** 26 → 21.

### Phase D-2 — Cart / shared-cart gateway (7 occurrences, 2 files)
- Build `cartGateway`. Realtime channel subscription stays browser-side via `@/integrations/supabase/client` (sanctioned for realtime; not a `.from(...)` call).
- Migrate `useCartOrchestrator`, `useSharedCartSync`.
- **C1 ratchet target:** 21 → 19.

### Phase D-3 — Bespoke route collapse (drives C4 → 0)
- Register `commerce.basket_builder`, `commerce.subscription_manager`, `commerce.compare_grid` blocks.
- Add 3 identities to `SECTION_IDENTITY_REGISTRY` (`baskets-build`, `baskets-subs`, `home-compare`).
- Delete the 3 page files + 3 route files; verify each URL renders identically via `store.$slug.tsx`.
- **C4 ratchet:** 3 → 0. **Wave P-D's only C4 step.**

### Phase D-4 — Catalog + library + driver + group-buy + hakim leaves (8 occurrences, 7 files)
- `catalogGateway.listProductReviews` (1) → `ProductDetail.tsx`.
- `libraryGateway` (2) → `PrintWizard`, `SchoolLibrarySection`.
- `driverGateway` (2) — write-side server fn for `publishDriverPosition`; read-side stays as a sanctioned realtime channel helper (no `.from()` in UI).
- `groupBuyGateway` (2) → `useGroupBuyEngine`.
- Hakim insights folded into `userGateway` (already covered in D-1) — re-verify FloatingGuardian here.
- **C1 ratchet target:** 19 → 12.

### Phase D-5 — HR / Employee gateway (7 occurrences, 2 files)
- Build `hrGateway` with admin/non-admin split (employee self-service + manager approvals).
- Migrate `EmployeeHub`, `AdvanceApprovals`.
- **C1 ratchet target:** 12 → 10.

### Phase D-6 — Admin catalog master-data (12 occurrences, 4 files)
- Build `adminCatalogGateway` (admin-gated).
- Migrate `Categories`, `Stores`, `Branches`, `PurchaseInvoiceBuilder`.
- **C1 ratchet target:** 10 → 6.

### Phase D-7 — Admin marketing (13 occurrences, 3 files)
- Build `marketingGateway`.
- Migrate `BannersPanel`, `CouponsPanel`, `FlashPanel`.
- **C1 ratchet target:** 6 → 3.

### Phase D-8 — Admin CRM + RBAC + BI (10 occurrences, 4 files)
- Build `crmGateway` + `rbacGateway`.
- Migrate `CustomerDetail`, `admin/Notifications`, `RolePermissions`, `BusinessOpsDashboard`.
- **C1 ratchet target:** 3 → 0.

### Phase D-9 — Lockdown
- Promote ESLint `no-restricted-imports` for `@/integrations/supabase/client` from **warn** to **error** in `src/components/**`, `src/pages/**`, `src/apps/**`. Allow only `src/integrations/**`, `src/lib/*.functions.ts`, `src/lib/*.queries.ts`, and `src/core/**/gateway/**`.
- Promote DEV watchdog (`src/core/runtime-ui/watchdog.ts`) from `console.error` to a thrown error in DEV.
- Append final P-D row declaring **Wave P-D COMPLETE** with **C1 = 0** and **C4 = 0**.

---

## 5. Risk Register

| Risk | Mitigation |
|---|---|
| Realtime channels (driver tracking, shared cart) require browser Supabase client | Realtime channel calls (`supabase.channel(...)`) are NOT counted in C1 (rule applies to `.from(`). Keep them; document the carve-out in `requireAdmin` PR. |
| Admin pages prerender at build time and 401 against `requireSupabaseAuth` | Place all admin routes under an `_authenticated/_admin/` layout (composes `requireAdmin` redirect in `beforeLoad`). Per `auth-protected-server-functions` rules. |
| Visual regression on the 3 bespoke pages after block conversion | Phase D-3 ships behind a feature flag `flags.bespokeBlocks` for one preview cycle; flip after manual parity test on `/store/baskets-build`, `/store/baskets-subs`, `/store/home-compare`. |
| `useCart` mutations spread across many components rely on optimistic local state | `cartGateway` exposes the same imperative API (`add`, `update`, `clear`) but routes writes through `createServerFn`; React Query owns the cache. Cart context becomes a thin wrapper, no consumer change required. |
| RBAC drift (some admin pages also need vendor/staff variants) | `requireAdmin` is one role; the gateways themselves accept a `role` param resolved server-side. Vendor pages (`pages/vendor/*`) are already off C1 scope (they don't call `.from(` directly) — verify in D-9 lockdown. |

---

## 6. Acceptance Criteria for Wave P-D Closure

1. Zero `.ts`/`.tsx` file under `src/components/**`, `src/pages/**`, `src/apps/**`, `src/hooks/**`, `src/modules/**` contains the literal `supabase.from(`.
2. `src/routes/_app/store.$slug.tsx` is the only vertical/section/bespoke route under `_app/store/`.
3. `eslint.config.js` enforces `no-restricted-imports` for `@/integrations/supabase/client` as **error** in UI layers (carve-out: realtime helpers documented).
4. `tsc --noEmit` green; preview smoke test passes for every former vertical and every former bespoke URL (`/store/baskets-build`, `/store/baskets-subs`, `/store/home-compare`).
5. `PURIFICATION_BASELINE.md` §4 carries the D-0 reconciliation row and a final P-D-COMPLETE row with **C1 = 0** and **C4 = 0**.

---

**End of Blueprint — no source files were modified during this reconnaissance.**
