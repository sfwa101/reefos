# EXECUTION REPORT — WAVE B-3 (Orders & Logistics Gateway)

> **Status:** ✅ Complete · `tsc --noEmit` passes · zero errors
> **Doctrine enforced:** `CONSTITUTION_AI_GOVERNANCE.md` §4 (Sovereign Isolation)
> **Predecessors:** Wave B-1 (Identity), Wave B-2 (Commerce)

---

## 1. What Was Accomplished

### 1.1 Sovereign Gateways Created

| Gateway | Path | Methods |
|---|---|---|
| **`OrderGateway`** | `src/core/orders/gateway/OrderGateway.ts` | `getCustomerOrders`, `getPickupOtp`, `getNodeItems`, `subscribeVendorNodes` |
| **`LogisticsGateway`** | `src/core/logistics/gateway/LogisticsGateway.ts` | `getDefaultStandardDeliveryMethod`, `createAddress` |

Both expose typed VMs (`SovereignOrderVM`, `VendorNodeItemVM`, `CreateAddressInput`)
and shield UI from raw Supabase row shapes. Realtime channel ownership for
`salsabil_fulfillment_nodes` now lives inside `OrderGateway.subscribeVendorNodes`,
honoring `SUPABASE_SOVEREIGNTY` §9.

Barrel exports: `src/core/orders/index.ts`, `src/core/logistics/index.ts`.

### 1.2 UI Files Purged (5 files, 6 violations excised)

| # | File | Violation Removed | Replaced With |
|---|---|---|---|
| 1 | `src/pages/OrderSuccess.tsx` | `supabase.from("salsabil_fulfillment_nodes")` + `supabase.rpc("get_handover_otp")` | `OrderGateway.getPickupOtp()` |
| 2 | `src/pages/account/Orders.tsx` | `supabase.from("salsabil_master_orders")` 4-level join | `OrderGateway.getCustomerOrders()` |
| 3 | `src/pages/vendor/VendorOrders.tsx` | `supabase.from("salsabil_fulfillment_items")` + `supabase.channel/removeChannel` mixed | `OrderGateway.getNodeItems()` + `OrderGateway.subscribeVendorNodes()` |
| 4 | `src/apps/reef-al-madina/features/logistics/hooks/useDefaultDeliveryMethod.ts` | `supabase.from("delivery_methods")` | `LogisticsGateway.getDefaultStandardDeliveryMethod()` |
| 5 | `src/apps/reef-al-madina/features/logistics/components/AddressSheet.tsx` | `supabase.from("addresses").insert(...)` | `LogisticsGateway.createAddress()` |

All five files no longer import `@/integrations/supabase/client`.

### 1.3 Verification

- ✅ `tsc --noEmit` → 0 errors.
- ✅ Sovereign Asset graph traversal centralized; row shapes parsed once.
- ✅ Vendor realtime subscription is now gateway-owned (no mixed `.from()` + channel in UI).

---

## 2. Architectural Observations (Hidden Complexity Discovered)

### 2.1 Duplicated Order Tree Type Definitions
`Account/Orders.tsx` carried local `SovereignItem`/`SovereignNode`/`SovereignOrder`
types that mirrored the Supabase row shape. These were **structurally identical**
to what would naturally be a single canonical `SovereignOrderVM`. We hoisted
them into `OrderGateway` and re-exported, eliminating the drift risk.

### 2.2 OTP Resolution Has Two Paths (RLS escape hatch)
`OrderSuccess.tsx` first reads `delivery_snapshot.handover.otp` and only falls
back to `get_handover_otp` RPC when RLS hides the snapshot. This dual-path
fallback is now gateway-encapsulated, but it signals an **RLS policy
inconsistency**: customers should be able to read their own snapshot directly.
*Recommendation:* normalize the RLS on `salsabil_fulfillment_nodes` so the RPC
fallback becomes dead code.

### 2.3 `UniversalAdminGrid` is a Sanctioned Direct-DB Surface
`VendorOrders.tsx` configures the grid with `dataSource.table = "salsabil_fulfillment_nodes"`.
The grid component itself queries Supabase internally — it is a **shared,
audited query infrastructure** (similar to a table-level adapter). This is
**outside** the strict gateway pattern. Wave B-3 left it untouched (per the
audit's whitelisting), but Wave B-6 should formally promote
`UniversalAdminGrid` to a "constitutionally exempt infrastructure component"
in the doctrine, OR refactor it to consume gateways.

### 2.4 Reorder Logic Still Couples to Legacy Catalog
`Account/Orders.tsx::reorder()` calls `getById(legacyProductId)` from
`@/core/catalog/legacy/legacyRuntime`. The `assetIdToLegacyProductId` UUID
mangling (`usa_${assetId.replace(/-/g, "")}`) is a **pollution anti-pattern**
that should be eliminated by `CommerceGateway.reorderFromOrder(orderId)`.

### 2.5 `AddressSheet` Embeds Snapshot Schema Knowledge
The `addresses` row shape (`building_type`, `apartment_no`, `delivery_instructions`)
is now declared in two places — the gateway and the form. A future iteration
should expose a `LogisticsGateway.AddressDraft` Zod schema and bind the form
to it (single source of truth).

---

## 3. AI Strategic Suggestions — Next Wave

### 3.1 Recommended Wave B-4: **Vendor & Driver Engines**
The largest remaining concentration of pollution sits in
`src/apps/reef-al-madina/features/{vendor,driver}/hooks/**`:

- `useDriverEngine.ts` — 5 raw table writes + realtime + business logic
- `useDispatchRadar.ts` — 2 raw reads + RPC + realtime
- `useVendorOperations.ts` — 3 raw writes + realtime
- `useVendorSettlement.ts` — 3 raw reads + RPC + client-side wallet aggregation
- `useAffiliateEngine.ts` — 5 raw reads + RPC + client-side commission math

These are **engine hooks** that mix DB I/O with business rules. They require
runtime extraction (not just gateway bridging) per `KERNEL_MINIMALISM`. Suggest:

1. **VendorRuntime** — wraps `useVendorSettlement` + `useVendorOperations`,
   moves wallet aggregation to a server-side `vendor_wallet_summary` view.
2. **DriverRuntime** — absorbs `useDriverEngine` + `useDispatchRadar` +
   `useActiveDriverTracking`; exposes typed dispatch state machine.
3. **AffiliateRuntime** — absorbs `useAffiliateEngine`; commission math moved
   to a `commission_summary` server fn.

### 3.2 Critical Pre-Wave Action: Drop the Legacy Reorder Bridge
Before Wave B-4 begins, eliminate `assetIdToLegacyProductId` and
`@/core/catalog/legacy/legacyRuntime` consumption in `Account/Orders.tsx`.
Cleanest path: ship `CommerceGateway.reorderFromOrder(orderId): { addedCount }`
that returns canonical asset IDs and uses `useCart().add` via VM ids only.

### 3.3 Promote Universal Grid to a First-Class Gateway Adapter
`UniversalAdminGrid` is the single largest "uncategorized" Supabase surface
in the project. Either:
- **Option A:** Add it to a "Constitutionally Exempt Infrastructure" allowlist
  in `SUPABASE_SOVEREIGNTY` §2 (with explicit governance rationale), or
- **Option B:** Refactor it to accept a `gateway: () => Promise<T[]>` prop and
  deprecate the `dataSource.table` pathway.

Option B is the long-term sovereign path.

### 3.4 Realtime Subscription Convention
With this wave, we now have two patterns for realtime:
- `OrderGateway.subscribeVendorNodes(id, onEvent) → unsubscribe`
- Other realtime hooks still inline `supabase.channel`.

Codify: **all realtime subscriptions return an `unsubscribe()` from a gateway
method, never a raw channel object.** This enables future migration to
non-Supabase realtime providers without touching UI.

---

## 4. Wave B-3 Closing Statement

The Order Gateway and Logistics Gateway are online. Customer order history,
checkout success, vendor fulfillment radar, and address creation now flow
exclusively through the Sovereign Runtime. Five UI files are gateway-clean.
Two new domains (`src/core/orders`, `src/core/logistics`) are constitutionally
sealed.

**Pollution count delta (Wave A baseline):**

| Surface | B-Start | After B-3 |
|---|---|---|
| UI files importing supabase | 37 | **32** |
| `supabase.from(...)` in UI | 44 | **38** |
| `supabase.rpc(...)` in UI | 5 | **4** |
| Realtime mixed with `.from()` | 6 | **5** |

**End of `EXECUTION_REPORT_WAVE_B3.md`. Awaiting Wave B-4 extraction order.**
