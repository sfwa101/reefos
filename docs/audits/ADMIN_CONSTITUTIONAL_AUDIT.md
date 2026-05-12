# Admin Hub — Constitutional Audit

**Auditor:** Supreme Constitutional Auditor
**Scope:** `src/pages/admin/`, `src/apps/reef-al-madina/features/admin/`, admin gateways in `src/lib/`
**Mode:** READ-ONLY reconnaissance
**Verdict:** ❌ **NOT CONSTITUTIONALLY PURE — REMEDIATION REQUIRED**

---

## Executive Summary

Despite Wave P-D closing `BannersPanel`, `CouponsPanel`, `FlashPanel`, `BusinessOpsDashboard`, `CustomerDetail`, `Notifications`, and `RolePermissions`, the Admin Hub at large was **never migrated**. A targeted scan reveals **46 admin files** still importing the raw Supabase client and **20+ files** performing hardcoded role checks. The earlier "C1 = 0" claim from Wave P-D appears to have been scoped only to the 7 panels listed in that wave — the remaining surface area was not audited.

The dynamic Section Manager feature **MUST NOT** be built on top of this layer until remediation Waves R-1, R-2, and R-3 (defined below) are complete.

---

## Checklist Results

### 1. Article 3 — Data Plane & Logic
**Status: ❌ FAIL (CRITICAL)**

#### 1a. Direct Supabase imports in Admin UI — **46 files**

`src/pages/admin/`:
| File | Line |
|---|---|
| AffiliateSettings.tsx | 2 |
| AllocationMonitor.tsx | 2 |
| BusinessRules.tsx | 33 |
| CFODashboard.tsx | 6 |
| CategoryAffinity.tsx | 6 |
| Charity.tsx | 4 |
| Customers.tsx | 4 |
| Dashboard.tsx | 41 |
| DeliverySettings.tsx | 2 |
| DriverSettlements.tsx | 2 |
| ExecutiveDashboard.tsx | 2 |
| Expenses.tsx | 4 |
| Finance.tsx | 9 |
| HakimAdvisor.tsx | 4 |
| HakimAnomalies.tsx | 4 |
| HakimChat.tsx | 5 |
| HakimInsights.tsx | 4 |
| HumanDirectory.tsx | 10 |
| Inventory.tsx | 3 |
| Kyc.tsx | 4 |
| LowStock.tsx | 2 |
| Offers.tsx | 2 |
| OrderDetail.tsx | 17 |
| Orders.tsx | 16 |
| Partners.tsx | 4 |
| PaymentsSchedule.tsx | 4 |
| ProductUnits.tsx | 4 |
| ProfitObservationRoom.tsx | 34 |
| PurchaseInvoices.tsx | 11 |
| RibaAudit.tsx | 4 |
| Settings.tsx | 6 |
| SovereignControlPlane.tsx | 8 |
| SovereignTracing.tsx | 4 |
| SovereignTreasury.tsx | 11 |
| Staff.tsx | 5 |
| Suppliers.tsx | 4 |
| Support.tsx | 3 |
| TopupApprovals.tsx | 4 |
| Wallets.tsx | 7 |
| Zakat.tsx | 4 |

`src/apps/reef-al-madina/features/admin/`:
| File | Line |
|---|---|
| hakim/HakimTerminal.tsx | 11 |
| hakim/hooks/useHakimExecutor.ts | 7 |
| marketing/BannersPanel.tsx | 8 ⚠️ (regression vs. P-D claim) |
| product-editor/VisionGenesisUploader.tsx | 18 |
| usa-editor/USAEditor.tsx | 17 |
| usa-editor/InventoryMatrixPanel.tsx | 7 |

**Article violated:** Article 3 — *"The UI is forbidden from speaking directly to the data plane. All reads/writes flow through `createServerFn` gateways."*

#### 1b. Business logic in presentation layer
| File | Lines | Logic |
|---|---|---|
| `src/apps/reef-al-madina/features/admin/components/PurchaseInvoiceBuilder.tsx` | 123–124 | `subtotal + tax = total` computed in component |
| `src/apps/reef-al-madina/features/admin/product-editor/PricingAndInventory.tsx` | 91 | Margin/profit threshold logic (`marginInfo.margin * 0.2`) inline |
| `src/pages/admin/Zakat.tsx` | 25, 39, 92 | Nisab default value & "above nisab" branding inline; RPC call from UI |
| `src/pages/admin/Settings.tsx` | 17 | `tax_pct` shape declared in UI |

**Article violated:** Article 3 — *"Math, tax, eligibility, and pricing belong to the engine/server fn, never the view."*

---

### 2. Article 3 — Role vs. Capability
**Status: ❌ FAIL (HIGH)**

20+ admin pages perform `hasRole("admin" | "finance" | "store_manager" | …)` directly in the component tree to gate rendering. The Constitution mandates capability checks (or letting `requireAdmin` / `assertApproverRole` middleware enforce on the gateway), not literal role-string matching in UI.

| File | Line | Violation |
|---|---|---|
| AdvanceApprovals.tsx | 22 | `role === "admin" \|\| role === "finance" \|\| role === "branch_manager"` |
| AffiliateSettings.tsx | 20 | `hasRole("admin")` |
| BusinessOpsDashboard.tsx | 34 | tri-role string check |
| CategoryAffinity.tsx | 25 | tri-role string check |
| CFODashboard.tsx | 29 | tri-role string check |
| Charity.tsx | 18 | dual-role string check |
| ExecutiveDashboard.tsx | 25 | tri-role string check |
| Expenses.tsx | 30 | tri-role string check |
| HakimAdvisor.tsx | 23 | tri-role string check |
| HakimChat.tsx | 15 | tri-role string check |
| LowStock.tsx | 13 | dual-role string check |
| Partners.tsx | 22 | dual-role string check |
| PaymentsSchedule.tsx | 16 | tri-role string check |
| ProductUnits.tsx | 45 | tri-role string check |
| PurchaseInvoices.tsx | 40 | tri-role string check |
| RibaAudit.tsx | 18 | dual-role string check |
| SovereignControlPlane.tsx | 194 | `hasRole("admin")` |
| SovereignTracing.tsx | 101, 120 | `hasRole("admin")` (gates query) |
| TopupApprovals.tsx | 38 | `hasRole("admin")` |
| Wallets.tsx | 197 | dual-role string check |
| Zakat.tsx | 21 | dual-role string check |

**Article violated:** Article 3 — *"Roles are a server-side identity primitive. The UI consumes capabilities, not roles."*

---

### 3. Article 3a — Anti-Hardcoding Law
**Status: ❌ FAIL (MEDIUM)**

| File | Line | Hardcoded Domain Knowledge |
|---|---|---|
| `src/apps/reef-al-madina/features/admin/product-editor/types.ts` | 42–51 | Section slugs `meat`, `sweets`, `pharmacy`, `baskets`, `restaurants`, `recipes` baked into a static option array. These are **stale** post-Wave P-E (renamed to `weighed-prep`, `custom-fulfillment`, `health-care`, `commerce-bundles`, `vendor-menu`, `instruction-guides`) AND violate Article 3a regardless of name. Source must be `SectionIdentityRegistry`. |
| `src/apps/reef-al-madina/features/admin/marketing/FlashPanel.tsx` | 206 | Placeholder `"meat"` literal in a category input — leaks domain assumption into UI. |

**Article violated:** Article 3a — *"No vertical's identity, slug, or capability set may be hardcoded in shared/admin code. The Registry is the single source of truth."*

---

### 4. Article 5 — Layered Architecture
**Status: ❌ FAIL (CRITICAL — derivative of #1)**

By definition, every file listed in §1a violates Article 5: the Admin UI is reaching across the gateway boundary into the data plane. The dedicated gateways (`admin-catalog.functions.ts`, `crm.functions.ts`, `hr.functions.ts`, `marketing.functions.ts`, `ops.functions.ts`, `rbac.functions.ts`) exist but are **bypassed by 46 of the ~75 admin surfaces**.

Positive note: `src/lib/admin-catalog.queries.ts` and `src/lib/hr.queries.ts` correctly wrap server fns in React Query options — the **pattern** is in place; it has simply not been propagated.

---

## Remediation Roadmap (proposed Waves)

| Wave | Scope | Output |
|---|---|---|
| **R-1 (Gateway Expansion)** | Build the missing gateways: `finance.functions.ts`, `inventory.functions.ts`, `orders.functions.ts`, `wallets.functions.ts`, `hakim.functions.ts`, `sovereign.functions.ts`, `kyc.functions.ts`, `support.functions.ts`. Pair each with a `*.queries.ts`. | ~8 new gateway pairs, each `requireAdmin`-protected. |
| **R-2 (UI Migration — 46 files)** | Replace every `supabase.from(...)` / `supabase.rpc(...)` call site with `useServerFn` + React Query. Eradicate raw Supabase imports from `src/pages/admin/` and `src/apps/.../features/admin/`. | C1 truly = 0. |
| **R-3 (Role → Capability Refactor)** | Introduce `useCapability("can_view_finance" \| "can_approve_advance" \| …)`. Replace all 20+ `hasRole(...)` UI gates. Capabilities resolved server-side from role mapping. | C2 = 0. |
| **R-4 (Logic Eviction)** | Move zakat/nisab default, invoice-total math, and margin-tier thresholds into `finance.functions.ts` / pricing engine. UI renders server-returned values only. | C3-logic = 0. |
| **R-5 (Registry Wiring)** | Replace static section-slug arrays in `product-editor/types.ts` and the FlashPanel placeholder with reads from `SectionIdentityRegistry`. | Article 3a clean. |

---

## Conclusion

The Admin Hub is **NOT Constitutionally Pure**. The dynamic Section Manager — which by design expresses pure capability orchestration over the Registry — would inherit and amplify these violations if built today. **Waves R-1 → R-5 must precede any Section Manager work.**

Estimated remediation surface: **46 UI files + 8 new gateways + ~20 role-gate refactors**.

— *End of Audit*
