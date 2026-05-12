# Admin Functional & Hardcoding Audit — Wave R-2 Reconnaissance

**Status:** READ-ONLY reconnaissance. No source files were modified.
**Scope:** `src/pages/admin/**`, `src/apps/reef-al-madina/features/admin/**`, `src/lib/*.functions.ts`, `src/components/admin/**`.
**Date:** 2026-05-12.

This document inventories the technical debt remaining after Wave R-1.
Findings are sorted by **severity** (Critical → High → Medium) and grouped by
audit pillar. Each item lists **file**, **line(s)**, **defect**, and a
**proposed architectural fix**.

---

## 🔴 CRITICAL — Constitutional Violations & Sovereign Blockers

### C-1. Direct Supabase imports still present in shared Admin components (Article 3a)
Wave R-1 cleared the Admin **pages**, but ten shared/lower-level Admin
components still import the raw client. Because every list and detail screen
composes them, the violation is effectively project-wide.

| File | Line | Defect | Fix |
|---|---|---|---|
| `src/components/admin/UniversalAdminGrid.tsx` | 8 | Raw `supabase` import; the universal list grid runs `.from(...).select(...).range(...)` on every Admin route that uses it (audit-log, KYC, reviews, savings, low-stock, …). | Introduce a `listAdminGridFn` server function (entity + pagination + searchKeys). Make `UniversalAdminGrid` consume it via `useServerFn` + `useInfiniteQuery`. Drop the client import. |
| `src/components/admin/AnalyticsCharts.tsx` | 10 | Direct table reads for chart data. | Move queries into `analytics.functions.ts` (`getAdminAnalyticsFn`). |
| `src/components/admin/DesktopTopbar.tsx` | 6 | Direct read of profile/role for the top-bar avatar. | Source from existing `useAdminRoles` / a new `getCurrentAdminProfileFn`. |
| `src/components/admin/HakimChatDrawer.tsx` | 4 | Direct DB read for chat history. | Use the existing `useHakimChatStream` hook & `hakim-chat.functions.ts`. |
| `src/components/admin/HakimPulseBanner.tsx` | 3 | Realtime channel + select. | Wrap in a dedicated `useHakimPulseBanner` hook (Article 5 exemption). |
| `src/components/admin/HakimSovereignCard.tsx` | 3 | Direct read. | Move into `hakim.functions.ts` → `getSovereignCardFn`. |
| `src/components/admin/LiveEventStream.tsx` | 2 | Direct realtime subscription mixed with select. | Extract to `useLiveEventStream` hook. |
| `src/components/admin/OrderSlideOver.tsx` | 10 | Direct order detail reads / status writes. | Reuse `getMasterOrderDetailFn` + `setOrderStatusFn` (already exist). |
| `src/components/admin/RoleGuard.tsx` | 4 | Direct `auth.getUser()` + `user_roles` select. | Acceptable only if encapsulated; otherwise expose `getMyRolesFn` and consume here. |
| `src/components/admin/crm/HumanProfileSheet.tsx` | 10 | Direct profile / orders / wallet reads. | Already covered by `getCustomer360Fn` — switch the consumer. |

**Architectural fix:** every above file MUST consume server functions only.
After remediation, run `rg "@/integrations/supabase/client" src/components/admin src/pages/admin src/apps/reef-al-madina/features/admin` and confirm **0** matches.

---

### C-2. Missing CRUD operations on critical domain gateways
The following server functions are **completely absent** from the codebase,
which means the corresponding admin screens cannot Update or Delete records
without violating Article 3a from the UI:

| Domain | Missing server fns | Impact |
|---|---|---|
| Customers (`crm.functions.ts:190`) | `createCustomerFn`, `updateCustomerFn`, `deleteCustomerFn` | `Customers.tsx` and `CustomerDetail.tsx` are read-only directories. |
| Humans (`crm.functions.ts:235` `listHumanDirectoryFn`) | `createHumanFn`, `updateHumanFn`, `mergeHumansFn` | `HumanDirectory.tsx:88` already shows a disabled "إضافة إنسان" button (`title="قريباً"`). |
| Suppliers (`admin-catalog.functions.ts:334-356`) | `updateSupplierFn`, `deleteSupplierFn`, `setSupplierActiveFn` | `Suppliers.tsx` cannot edit terms or close-day after creation. |
| Partners (`finance.functions.ts:534-588`) | `updatePartnerFn`, `deletePartnerFn` | `Partners.tsx` can only toggle active. |
| Expenses (`finance.functions.ts:274-293`) | `updateExpenseFn`, `deleteExpenseFn`, `attachExpenseReceiptFn` | `Expenses.tsx:141` is append-only. |
| Wallet adjustments | `adminAdjustWalletFn`, `reverseWalletEntryFn` | `Wallets.tsx` can top-up but cannot debit/correct. |
| Affiliate (`finance.functions.ts:328-360`) | `deleteAffiliateSettingFn` | `AffiliateSettings.tsx` accumulates rows forever. |
| Roles & permissions | `createRoleFn`, `assignRoleFn`, `revokeRoleFn` | `RolePermissions.tsx` is a placeholder list (no actions). |

**Architectural fix:** in every gateway file, add a symmetric `update*Fn` and
`delete*Fn` (POST) backed by RPCs (or `admin_entity_upsert` where the entity
is registered in `entity_definitions`). Surface them as forms / row actions in
the corresponding pages.

---

### C-3. `HumanDirectory.tsx` "Add Human" button is permanently disabled
- **File:** `src/pages/admin/HumanDirectory.tsx`
- **Lines:** 86–93
- **Defect:** the only entry-point for creating a new human is rendered with
  `disabled` and `title="قريباً"`. Combined with C-2, the workspace cannot
  onboard a customer/vendor/partner/staff manually.
- **Fix:** wire to `createHumanFn` (to be implemented in `crm.functions.ts`)
  and open the existing `HumanProfileSheet` in "create" mode.

---

## 🟠 HIGH — Read-Only Screens that Should Be Read/Write

The following screens query data via `useQuery` / `useServerFn` but expose
**no mutations**, making the workspace unable to operate them end-to-end.

| File | Lines | Missing capability | Proposed fix |
|---|---|---|---|
| `src/pages/admin/SovereignTracing.tsx` | full file | No filter persistence, no "ack/dismiss event", no export. | Add `acknowledgeTraceEventFn` + CSV export action. |
| `src/pages/admin/SovereignControlPlane.tsx` | 85–120 | Toggles work, but breaker reset/override is missing. | Add `resetCircuitBreakerFn` + UI button. |
| `src/pages/admin/Notifications.tsx` | full file | Pure list; no compose/broadcast UI even though `broadcastNotificationFn` exists at `crm.functions.ts:129`. | Mount a "Compose broadcast" sheet wired to that fn. |
| `src/pages/admin/Reviews.tsx` | full file | Cannot approve / hide / reply. | Add `setReviewStatusFn` + `respondToReviewFn`. |
| `src/pages/admin/Kyc.tsx` | full file | Lists requests; the existing `updateKycStatusFn` (`hr.functions.ts:326`) is **not wired** to row actions. | Add row actions calling `updateKycStatusFn` + `getKycSignedUrlsFn`. |
| `src/pages/admin/Savings.tsx` | full file | Read-only Placeholder-derived list. No close/withdraw actions. | Implement `closeSavingsGoalFn` + UI. |
| `src/pages/admin/CommissionLedger.tsx` | full file | No "mark paid" / dispute action. | Add `markCommissionPaidFn`. |
| `src/pages/admin/CrossBranchTransfers.tsx` | full file | No "create transfer" or "approve transfer" action. | Wire to existing or new `createTransferFn` / `approveTransferFn`. |
| `src/pages/admin/PrintJobs.tsx` | full file | No retry/cancel. | Add `retryPrintJobFn` / `cancelPrintJobFn`. |
| `src/pages/admin/Referrals.tsx` | full file | No payout trigger. | Add `payReferralCommissionFn`. |
| `src/pages/admin/InventoryLocations.tsx` | full file | Cannot create/rename a location. | Add `upsertInventoryLocationFn`. |
| `src/pages/admin/ProductBatches.tsx` | full file | Cannot adjust expiry / write-off. | Add `writeOffBatchFn`. |
| `src/pages/admin/PurchaseInvoices.tsx` | 1–50 | List exists; no edit/cancel of an invoice once created. | Add `updatePurchaseInvoiceFn` / `cancelPurchaseInvoiceFn`. |

---

### H-2. Hardcoded domain enums in UI (Article 3a — physical-vertical leakage)
These arrays harden product/business semantics into the presentation layer
and prevent a new tenant or vertical from being added without a code change.

| File | Line | Hardcoded array | Proposed fix |
|---|---|---|---|
| `src/pages/admin/Expenses.tsx` | 10–21 | 10 expense `CATEGORIES` (operations, salaries, …). | Source from `expense_categories` table via `listExpenseCategoriesFn`, or `entity_definitions` for `expense.category`. |
| `src/pages/admin/Orders.tsx` | 41 | `ACTIVE_STATUSES` constant. | Move to `core/order/statusMachine.ts` (single source of truth). |
| `src/pages/admin/OrderDetail.tsx` | 191 | `["pending","confirmed","preparing","ready"]` driver-assignment gate. | Same status machine module. |
| `src/pages/admin/finance/TransferForm.tsx` | 64 | `CURRENCIES = [...]`. | `listCurrenciesFn` (already supported by sovereign treasury). |
| `src/pages/admin/HumanDirectory.tsx` | 21–28, 99 | `customer/vendor/partner/staff/workspace_member` enum + chip styles + filter bar. | Drive from `human_kinds` table or capability-resolver; keep style tokens generic. |
| `src/apps/reef-al-madina/features/admin/marketing/types.ts` | 95 | `TIERS = ["bronze","silver","gold","platinum"]`. | Move to `loyalty_tiers` table; expose `listLoyaltyTiersFn`. |
| `src/apps/reef-al-madina/features/admin/marketing/FlashPanel.tsx` | 19, 200, 206 | Hardcoded category placeholder `"meat"` and free-text product/category inputs. | Replace with `<EntityPicker entity="categories" />` and `<EntityPicker entity="products" />`. |
| `src/components/admin/SmartActionComposer.tsx` (per Wave R-1 audit) | full file | Hardcoded action ids list. | Drive from `quick_actions` registry table. |

---

### H-3. Gateway functions that wrap raw `.from(...).select(...)` without RPC delegation
Several "server functions" are simple SELECT shells — they satisfy Article 3a
on the client side but bypass DB-level business rules and are vulnerable to
tenant/scope drift. These should be migrated to PostgREST RPCs that enforce
RLS + tenant scoping in SQL.

| File | Examples | Risk |
|---|---|---|
| `src/lib/finance.functions.ts` | `listExpensesFn` (274), `listAffiliateSettingsFn` (328), `listPurchaseInvoicesFn` (388) | No tenant scoping in SQL; relies on RLS only. |
| `src/lib/crm.functions.ts` | `listCustomersFn` (190), `listHumanDirectoryFn` (235) | Same. |
| `src/lib/admin-catalog.functions.ts` | `listSuppliersFn` (279), `listSuppliersFullFn` (334) | Same. |

**Fix:** migrate each `list*Fn` to a `admin_*_list` RPC that performs the
tenant filter and returns the typed payload. The server fn becomes a thin
RPC caller.

---

## 🟡 MEDIUM — Polish & Consistency

### M-1. `src/pages/admin/Placeholder.tsx` is still imported
- **File:** `src/pages/admin/Placeholder.tsx`
- **Lines:** 1–25 (entire file).
- **Defect:** the "قيد التطوير" placeholder component is shipped and still
  exported, even though no admin route currently mounts it directly. It is a
  trap waiting to be re-introduced.
- **Fix:** delete the file once C-2 / H-1 deliver real screens; until then,
  add a lint rule blocking imports of `@/pages/admin/Placeholder`.

### M-2. `Marketing/FlashPanel.tsx` & `CouponsPanel.tsx` use raw `<input>` for entities
- **Files:** `src/apps/reef-al-madina/features/admin/marketing/FlashPanel.tsx:200,206`
  and `marketing/CouponsPanel.tsx:170,193`.
- **Defect:** product / category / coupon-code fields are free-text. Easy to
  produce orphan rows (typos in `product_id`, missing `category`).
- **Fix:** replace inputs with the SDUI `<EntityPicker>` already used in the
  USA editor; reuse `useEntityDefinition`.

### M-3. `Wallets.tsx` top-up form still uses raw text inputs
- **File:** `src/pages/admin/Wallets.tsx`
- **Lines:** 130–200.
- **Defect:** the form uses bespoke `<input>`s instead of the design-system
  `Input`/`Field` primitives → inconsistent typography, RTL alignment glitches,
  and no inline validation.
- **Fix:** migrate to the same `<Field>` primitive used by `Partners.tsx` and
  `marketing/CouponsPanel.tsx`. Add Zod-based amount/reference validation.

### M-4. `OrderDetail.tsx` aggregated status is computed in the UI
- **File:** `src/pages/admin/OrderDetail.tsx`
- **Lines:** 52–60 (`aggregateStatus`).
- **Defect:** business logic ("if all delivered → delivered, else …") lives in
  the presentation layer.
- **Fix:** move into `core/order/statusMachine.ts`; have
  `getMasterOrderDetailFn` return the aggregated status pre-computed.

### M-5. `BusinessOpsDashboard.tsx` polls every 15s without backoff
- **File:** `src/pages/admin/BusinessOpsDashboard.tsx`
- **Lines:** 36–43.
- **Defect:** `refetchInterval: 15_000` even when the tab is hidden or the
  user is idle. Cost & power impact on always-on tablets.
- **Fix:** combine with `useDocumentVisibility` + exponential backoff on
  errors. Optionally swap polling for the Hakim realtime channel.

### M-6. `HumanDirectory.tsx` colour map uses raw Tailwind, not design tokens
- **File:** `src/pages/admin/HumanDirectory.tsx`
- **Lines:** 21–25.
- **Defect:** `bg-info/10 text-info`, `bg-primary/10 text-primary` … are fine,
  but the `workspace_member: "bg-muted text-foreground-secondary"` mixes
  semantic and surface tokens inconsistently with the rest of the system.
- **Fix:** centralise in `src/lib/humanKindStyles.ts` once the kinds become
  data-driven (see H-2).

### M-7. `RoleGuard.tsx` is the only component that needs to keep a direct Supabase import
- **File:** `src/components/admin/RoleGuard.tsx`
- **Lines:** 4.
- **Defect:** the guard reads `auth.getUser()` and the `user_roles` table at
  module boot. This is acceptable per Article 5 (authentication primitive),
  but should be documented as an explicit exemption.
- **Fix:** add an inline `// @constitutional-exemption: Article 5 — auth boot`
  comment and link to `docs/constitution/CAPABILITY_SYSTEM.md`.

---

## Remediation Plan — Suggested Wave R-2 Sequence

1. **Batch A (unblocks everything):** rebuild `UniversalAdminGrid` on a server fn
   (C-1). This single change collapses ~15 indirect Article-3a violations.
2. **Batch B:** ship the missing `create*/update*/delete*Fn` for Customers,
   Humans, Suppliers, Partners, Expenses, Wallet adjustments, Roles (C-2, C-3).
3. **Batch C:** wire HIGH read-only screens (H-1) to those new mutations.
4. **Batch D:** purge hardcoded enums (H-2) by introducing `listEnumFn`
   helpers backed by `entity_definitions` / dedicated lookup tables.
5. **Batch E:** RPC-ify the `list*Fn` shells (H-3) for tenant isolation.
6. **Batch F:** medium polish (M-1 → M-7) and delete `Placeholder.tsx`.

---

## Acceptance Gate

After Wave R-2 the following must hold true:

```bash
# 1. Zero raw client imports in the admin layer.
rg "@/integrations/supabase/client" src/components/admin src/pages/admin src/apps/reef-al-madina/features/admin
#   → 0 matches (RoleGuard.tsx exempted with annotation).

# 2. Every admin page exposes at least one mutation OR is explicitly read-only.
# 3. No `Placeholder.tsx` references remain.
# 4. No string literal arrays of business categories live outside src/lib/*.queries.ts or DB lookups.
```

