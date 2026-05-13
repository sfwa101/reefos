# PURIFICATION WAVE A — Constitutional Violation Map (READ-ONLY)

> **Status:** Read-only architectural audit. No code modified.
> **Doctrine:** `SUPABASE_SOVEREIGNTY.md` §2 — Supabase client is forbidden outside
> `src/core/<domain>/gateway/**`, server functions, and edge functions.
> **Scope scanned:** `src/pages`, `src/components`, `src/apps`, `src/modules`, `src/features`.
> **Methodology:** ripgrep AST-style pattern scan for `supabase.from`, `supabase.rpc`,
> `supabase.functions.invoke`, `supabase.storage`, `supabase.channel`,
> `supabase.removeChannel`, `supabase.auth`, plus duplicate domain-type detection.

---

## 1. Executive Summary

| Metric | Count |
|---|---|
| UI files importing `@/integrations/supabase/client` | **37** |
| Direct `supabase.from(...)` calls in UI | **44** |
| Direct `supabase.rpc(...)` calls in UI | **5** |
| Direct `supabase.functions.invoke(...)` in UI | **1** |
| Direct `supabase.storage.*` in UI | **3** |
| Direct `supabase.auth.getUser()` in UI | **6** |
| Realtime `supabase.channel/removeChannel` in UI hooks | **9** |
| Duplicated `Product` type defined in UI | **2** |

**Verdict:** The healthy core (`src/core/**`) is intact. Pollution is concentrated in
three rings: `src/apps/reef-al-madina/features/**` (the feature ring), `src/pages/**`
(routes), and a small set of shared `src/components/**`. No violations were found in
`src/pages/admin/**` (already gateway-clean post-Unification Strike).

---

## 2. Direct Database Access Violations

### 2.1 `supabase.from(...)` — Raw Table Reads/Writes

| # | File | Line | Table |
|---|---|---|---|
| 1 | `src/features/hakim/hooks/useHakimPulse.ts` | 59 | `hakim_anomalies` |
| 2 | `src/pages/vendor/VendorWallet.tsx` | 20 | `vendor_wallets` |
| 3 | `src/pages/vendor/VendorWallet.tsx` | 21 | `vendor_payouts` |
| 4 | `src/pages/vendor/VendorProducts.tsx` | 54 | `salsabil_inventory_matrix` |
| 5 | `src/pages/vendor/VendorOrders.tsx` | 91 | `salsabil_fulfillment_items` |
| 6 | `src/pages/OrderSuccess.tsx` | 44 | `salsabil_fulfillment_nodes` |
| 7 | `src/pages/Cart.tsx` | 41 | `shared_cart_participants` |
| 8 | `src/pages/Auth.tsx` | 44 | `user_roles` |
| 9 | `src/pages/FamilyHub.tsx` | 75 | `tayseer_family_members` |
| 10 | `src/pages/FamilyHub.tsx` | 92 | `tayseer_family_groups` |
| 11 | `src/pages/FamilyHub.tsx` | 100 | `tayseer_family_members` |
| 12 | `src/pages/FamilyHub.tsx` | 106 | `profiles` |
| 13 | `src/pages/FamilyHub.tsx` | 111 | `wallets` |
| 14 | `src/pages/FamilyHub.tsx` | 134 | `tayseer_wallet_limits` |
| 15 | `src/pages/FamilyHub.tsx` | 144 | `tayseer_shared_vaults` |
| 16 | `src/pages/FamilyHub.tsx` | 174 | `tayseer_family_groups` |
| 17 | `src/pages/FamilyHub.tsx` | 430 | `tayseer_wallet_limits` |
| 18 | `src/pages/account/Verification.tsx` | 52 | `kyc_verifications` |
| 19 | `src/pages/account/Verification.tsx` | 116 | `kyc_verifications` |
| 20 | `src/pages/account/Payments.tsx` | 45 | `payment_methods` |
| 21 | `src/pages/account/Orders.tsx` | 106 | `salsabil_master_orders` |
| 22 | `src/modules/search/components/RequestProductForm.tsx` | 65 | `product_requests` |
| 23 | `src/components/admin/RoleGuard.tsx` | 23 | `user_roles` |
| 24 | `src/components/TopBar.tsx` | 57 | `addresses` |
| 25 | `src/components/InactivityNudger.tsx` | 47 | `flash_sales` |
| 26 | `src/components/InactivityNudger.tsx` | 55 | `flash_sale_products` |
| 27 | `src/components/InactivityNudger.tsx` | 74 | `notifications` (insert) |
| 28 | `src/components/ui/SovereignPersonaSwitcher.tsx` | 83 | `salsabil_persona_matrix` |
| 29 | `src/components/store/BuyItAgainRail.tsx` | 32 | `salsabil_master_orders` |
| 30 | `src/components/store/BuyItAgainRail.tsx` | 41 | `salsabil_fulfillment_nodes` |
| 31 | `src/components/store/BuyItAgainRail.tsx` | 48 | `salsabil_fulfillment_items` |
| 32 | `src/apps/reef-al-madina/features/affiliate/hooks/useAffiliateEngine.ts` | 81,87,120,136,153 | `referral_codes`, `profiles`, `affiliate_tiers`, `user_affiliate_state`, `commission_ledger` |
| 33 | `src/apps/reef-al-madina/features/vendor/hooks/useVendorSettlement.ts` | 61,64,69 | `vendor_wallets`, `vendor_wallet_transactions`, `vendor_payout_requests` |
| 34 | `src/apps/reef-al-madina/features/vendor/hooks/useVendorOperations.ts` | 75,125,223 | `salsabil_assets`, `salsabil_fulfillment_nodes`, `salsabil_inventory_matrix` |
| 35 | `src/apps/reef-al-madina/features/vendor/components/SovereignSettlementsPanel.tsx` | 48 | `salsabil_vendor_settlements` |
| 36 | `src/apps/reef-al-madina/features/driver/hooks/useDriverEngine.ts` | 163,178,201,288,348 | `drivers`, `salsabil_fulfillment_nodes`, `geo_zones` |
| 37 | `src/apps/reef-al-madina/features/driver/hooks/useDispatchRadar.ts` | 51,69 | `drivers`, `salsabil_dispatch_offers` |
| 38 | `src/apps/reef-al-madina/features/cart/hooks/useCartValidation.ts` | 51 | `app_settings` |
| 39 | `src/apps/reef-al-madina/features/pos/hooks/usePosEngine.ts` | 94,243,350 | `pos_shifts` |
| 40 | `src/apps/reef-al-madina/features/kds/hooks/useKdsEngine.ts` | 37,56,142,155 | `salsabil_fulfillment_nodes`, `salsabil_fulfillment_items` |
| 41 | `src/apps/reef-al-madina/features/logistics/hooks/useDefaultDeliveryMethod.ts` | 64 | `delivery_methods` |
| 42 | `src/apps/reef-al-madina/features/logistics/components/AddressSheet.tsx` | 83 | `addresses` |
| 43 | `src/apps/reef-al-madina/features/offers/hooks/useOffersRails.ts` | 36 | `storefront_rails` |
| 44 | `src/apps/reef-al-madina/features/offers/hooks/useSpatioTemporalOffers.ts` | 88 | `offers_matrix` |
| 45 | `src/apps/reef-al-madina/features/storefront/home/hooks/useUiLayout.ts` | 100,109 | `ui_layouts` |

### 2.2 `supabase.rpc(...)` — Direct RPC Invocation

| File | Line | RPC |
|---|---|---|
| `src/pages/OrderSuccess.tsx` | 56 | `get_handover_otp` |
| `src/apps/reef-al-madina/features/affiliate/hooks/useAffiliateEngine.ts` | 100 | `ensure_referral_code` |
| `src/apps/reef-al-madina/features/vendor/hooks/useVendorSettlement.ts` | 111 | `request_vendor_payout` |
| `src/apps/reef-al-madina/features/cart/hooks/useCartValidation.ts` | 78 | `validate_coupon` |
| `src/apps/reef-al-madina/features/driver/hooks/useDispatchRadar.ts` | 123 | `accept_dispatch_offer` |

### 2.3 `supabase.functions.invoke(...)`

| File | Line | Edge Function |
|---|---|---|
| `src/features/hakim/hooks/useHakimPulse.ts` | 69 | `hakim-pulse` |

### 2.4 `supabase.storage.*` (Bucket I/O from UI)

| File | Line | Bucket | Op |
|---|---|---|---|
| `src/pages/account/Verification.tsx` | 61 | `<BUCKET>` | createSignedUrl |
| `src/pages/account/Verification.tsx` | 65 | `<BUCKET>` | createSignedUrl |
| `src/pages/account/Verification.tsx` | 86 | `<BUCKET>` | upload |

### 2.5 `supabase.auth.getUser()` from UI

| File | Line |
|---|---|
| `src/pages/Auth.tsx` | 108 |
| `src/pages/account/Payments.tsx` | 34 |
| `src/modules/search/components/RequestProductForm.tsx` | 55 |
| `src/components/store/BuyItAgainRail.tsx` | 28 |
| `src/apps/reef-al-madina/features/driver/hooks/useDriverEngine.ts` | 154 |
| `src/apps/reef-al-madina/features/driver/hooks/useDispatchRadar.ts` | 47 |

> **Note:** `useAuth()` from `@/context/AuthContext` already exposes the session.
> All six call sites should consume the context, not the raw client.

### 2.6 Realtime Subscriptions in UI Hooks

These are **legal under §9** (Realtime may live in hooks) but only when the hook is
the gateway-bound subscription wrapper — **not** when the same hook also performs
direct `.from(...)` queries.

| File | Status |
|---|---|
| `src/features/hakim/hooks/useHakimPulse.ts` | ❌ mixed (also `.from`) |
| `src/pages/vendor/VendorOrders.tsx` | ❌ mixed (also `.from`) |
| `src/apps/reef-al-madina/features/cart/hooks/useSharedCartSync.ts` | ✅ realtime-only |
| `src/apps/reef-al-madina/features/vendor/hooks/useVendorOperations.ts` | ❌ mixed |
| `src/apps/reef-al-madina/features/group-buy/hooks/useGroupBuyEngine.ts` | ⚠️ verify |
| `src/apps/reef-al-madina/features/kds/hooks/useKdsEngine.ts` | ❌ mixed |
| `src/apps/reef-al-madina/features/driver/hooks/useDriverEngine.ts` | ❌ mixed |
| `src/apps/reef-al-madina/features/driver/hooks/useDispatchRadar.ts` | ❌ mixed |
| `src/apps/reef-al-madina/features/driver/hooks/useActiveDriverTracking.ts` | ✅ realtime-only |

---

## 3. Duplicated Domain Models

| File | Line | Type | Verdict |
|---|---|---|---|
| `src/pages/admin/Partners.tsx` | 15 | `type Product = { id, name }` | **DUPLICATE** — must consume `salsabil_assets` VM. |
| `src/apps/reef-al-madina/features/admin/components/PurchaseInvoiceBuilder.tsx` | 27 | `type Product = { id, name, cost_price, stock }` | **DUPLICATE** — must consume Sovereign Asset DTO. |

> The legacy `Product` shape was excised from the catalog pipeline during the
> Unification Strike, but two stragglers redefine it locally. They will silently
> drift from the canonical `assetToCardVM` adapter.

---

## 4. Business Logic Trapped in UI

| File | Symptom | Required Engine |
|---|---|---|
| `src/apps/reef-al-madina/features/affiliate/hooks/useAffiliateEngine.ts` | Computes wallet `available/pending/lifetime` by iterating `commission_ledger` rows on the client (lines 165-176). | `AffiliateRuntime` (server view or RPC) |
| `src/apps/reef-al-madina/features/vendor/hooks/useVendorSettlement.ts` | Aggregates wallet totals client-side over rows (`totals` memo). | `VendorSettlementRuntime` (server-side `vendor_wallet_summary`) |
| `src/apps/reef-al-madina/features/cart/hooks/useCartValidation.ts` | Reads `app_settings` then re-applies coupon math locally before `validate_coupon` RPC. | Move all coupon math behind `CommerceGateway.validateCoupon`. |
| `src/apps/reef-al-madina/features/driver/hooks/useDriverEngine.ts` | Distance/zone resolution + node mutation logic in a hook (lines 178-348). | `LogisticsRuntime` (driver dispatch service). |
| `src/apps/reef-al-madina/features/pos/hooks/usePosEngine.ts` | Shift open/close + cash drawer logic via direct table writes. | `PosRuntime` (`openShiftFn`, `closeShiftFn` server fns). |
| `src/apps/reef-al-madina/features/kds/hooks/useKdsEngine.ts` | Fulfillment node state transitions written directly. | `KdsRuntime` server-fn. |
| `src/components/InactivityNudger.tsx` | Reads `flash_sales`, joins with `flash_sale_products`, and writes `notifications` from a UI component. | `OffersRuntime.peekFlashSale` + `NotificationsGateway.push`. |
| `src/pages/FamilyHub.tsx` | Family group + wallet-limit CRUD performed inline (10 raw calls). | `IdentityGateway.family.*` + `FinanceGateway.limits.*`. |
| `src/components/store/BuyItAgainRail.tsx` | Three-step join (`master_orders → fulfillment_nodes → fulfillment_items`) executed in a component effect. | `CommerceGateway.recentPurchases` server fn. |

---

## 5. Required Gateways (Extraction Blueprint)

The following **9 Gateways** must be created under `src/core/<domain>/gateway/`
to absorb the violations above. Each gateway exposes typed VMs and parses
responses with Zod before returning to UI.

| Gateway | Absorbs | Domain Slot |
|---|---|---|
| **`IdentityGateway`** | `useAuth` extension, `user_roles` reads, `profiles`, KYC, family graph | `src/core/identity/` *(new)* |
| **`CommerceGateway`** | Cart validation, coupon math, recent purchases, master-order reads | `src/core/commerce/` *(new)* |
| **`AffiliateGateway`** | `referral_codes`, `affiliate_tiers`, `user_affiliate_state`, `commission_ledger`, `ensure_referral_code` RPC | `src/core/affiliate/` *(new)* |
| **`VendorGateway`** | `vendor_wallets`, `vendor_payouts`, `vendor_wallet_transactions`, `vendor_payout_requests`, `request_vendor_payout` RPC, vendor product CRUD | `src/core/vendor/` *(new)* |
| **`LogisticsGateway`** | `drivers`, `geo_zones`, `salsabil_dispatch_offers`, `accept_dispatch_offer` RPC, `salsabil_fulfillment_nodes`, `delivery_methods`, `addresses` | `src/core/logistics/` *(new)* |
| **`FulfillmentGateway`** | `salsabil_fulfillment_items`, KDS state transitions, `get_handover_otp` RPC | `src/core/fulfillment/` *(new)* |
| **`PosGateway`** | `pos_shifts` lifecycle | `src/core/pos/` *(new)* |
| **`OffersGateway`** | `storefront_rails`, `offers_matrix`, `flash_sales`, `flash_sale_products`, `salsabil_persona_matrix`, `ui_layouts` | `src/core/offers/` *(extend existing engine)* |
| **`HakimGateway`** | `hakim_anomalies`, `hakim-pulse` edge invocation, anomaly realtime | `src/core/hakim/` *(new — wraps `core-os/hakim-ai`)* |
| **`StorageGateway`** | KYC `createSignedUrl` + `upload`, vision-staging uploads, product images | `src/core/storage/` *(new)* |
| **`NotificationsGateway`** | `notifications` table writes from `InactivityNudger` and similar | `src/core/notifications/` *(new)* |
| **`FinanceGateway`** | `wallets`, `payment_methods`, `tayseer_wallet_limits`, `tayseer_shared_vaults` | `src/core/finance/` *(extend existing `core-os/finance`)* |

---

## 6. Pollution Heatmap

```
src/apps/reef-al-madina/features/   ████████████████████   20 files
src/pages/                          ████████████           12 files
src/components/                     █████                   5 files
src/modules/                        █                       1 file
src/features/                       █                       1 file
src/core/                                                   0 files ✅
src/pages/admin/                                            0 files ✅
```

The `src/core/**` ring and the post-Unification `src/pages/admin/**` ring are
**fully constitutional**. The infection is bounded and excisable.

---

## 7. Proposed Wave Order (For Wave B Approval)

1. **Wave B-1 — Identity & Auth purge.** Build `IdentityGateway`, repoint
   `Auth.tsx`, `RoleGuard`, `BuyItAgainRail`, `RequestProductForm`, `Payments`,
   `useDriverEngine.getUser`, `useDispatchRadar.getUser`. (Smallest blast radius.)
2. **Wave B-2 — Commerce & Cart.** `CommerceGateway` + `useCartValidation`
   + `BuyItAgainRail` + `Cart.tsx` (`shared_cart_participants`).
3. **Wave B-3 — Vendor & Affiliate.** Replace the two engine hooks with their
   gateways. Drop the duplicated `Product` types in `Partners.tsx` and
   `PurchaseInvoiceBuilder.tsx`.
4. **Wave B-4 — Logistics & Fulfillment & POS & KDS.** Heaviest extraction;
   contains the most complex business logic.
5. **Wave B-5 — Offers, Notifications, Storage, Hakim, FamilyHub.** Mop-up.

---

## 8. Strict Constraints Honored

- ✅ Read-only. No source files modified.
- ✅ No refactoring proposed inside the report — only file paths, line numbers, and gateway names.
- ✅ Every violation maps to exactly one Sovereign Gateway.

**End of `PURIFICATION_WAVE_A_REPORT.md`. Awaiting Wave B extraction order.**
