# CASHIER BRAIN — Reconnaissance Report
**Audit Date:** 2026-05-12  
**Auditor:** Supreme Constitutional Auditor  
**Scope:** Cart totals, discounts, deposits, delivery, tips, wallet split, final grand total.  
**Mandate:** Constitution v2.0 — Article 12.1 (`ProductFinancialDNA` & The Cashier Brain).  
**Mode:** Read-only. No code mutated.

---

## 1. Executive Summary

Pricing math is fragmented across **three loosely-coupled layers** and is **predominantly computed in the browser**. The Sovereign Checkout RPC (`process_checkout_sovereign`) re-derives only the **unit price** from a vendor contract — it does **not** recompute discounts, deposits, delivery, tips, charity, or the final grand total. The server therefore trusts the client for every modifier-driven number outside raw line price.

A pure Layer-4 `CashierBrain` is required to (a) become the single mathematical oracle in both client and server contexts, and (b) close the trust gap by giving the Sovereign Router a deterministic, replayable snapshot to validate.

---

## 2. Where the Math Lives Today

### 2.1 Frontend — primary calculator
| File | Responsibility | Layer |
|---|---|---|
| `src/store/useCartStore.ts` | Cart state + `capturedPrice` snapshot at add-time. | State |
| `src/lib/pricingEngine.ts` (`calculateUniversalPrice`) | Pure per-line modifier pipeline (weight, addon, discount, deposit, fee, cross-sell). | Pure utility (already partially constitutional) |
| `src/core/engine/pricing/PricingEngine.ts` + `bootstrap.ts` | Strategy/Discount/Reward registry. Currently executed in **shadow mode** only. | Domain (Layer 4 — partial) |
| `src/apps/.../cart/hooks/useCartCalculations.ts` | **De-facto cashier.** Computes `subtotal`, `discount`, `delivery`, `grand`, sweets buckets, deposit aggregation, wallet split, change-jar, gift progress. | UI hook (VIOLATION) |
| `src/apps/.../cart/hooks/useCartOrchestrator.ts` | Adds logistics quote, charity, gift surcharge → `effectiveGrand`. | UI hook (VIOLATION) |
| `src/apps/.../cart/hooks/useCartVendorGrouping.ts` | Vendor segmentation + cashback totals. | UI hook |
| `src/apps/.../cart/hooks/useFakkaCalculator.ts` | Change-rounding heuristics. | UI hook |
| `src/core-os/barq-logistics/core/quote.ts` | Delivery fee + ETA + perishable surcharge. | Domain (OK, already pure) |

### 2.2 Frontend — secondary calculators (drift risk)
- `src/apps/.../pos/hooks/usePosEngine.ts` — POS recomputes its own totals.
- `src/apps/.../admin/components/PurchaseInvoiceBuilder.tsx` — admin-side invoice math.
- `src/core/runtime-ui/blocks/product/{sweets,meal,restaurant-item}-sheet.tsx` — per-sheet line totals.
- `src/core/runtime-ui/blocks/commerce/{basket-builder,basket-detail-sheet,smart-swap-sheet}.tsx` — bundle math.

Each duplicates portions of the line/total formula with subtle differences (rounding, deposit %, gift bonus).

### 2.3 Server — `process_checkout_sovereign`
File: `supabase/migrations/20260508203455_…sql`

What it **does** recompute:
- Per-line `v_unit_price` from `salsabil_financial_contracts.base_price` (or vendor `override_price`).
- `v_line_total = v_unit_price × v_qty`.
- `v_grand_total = Σ v_line_total`.

What it **does NOT** recompute (silently trusts client `delivery_info`):
- Promo / coupon discount.
- Loyalty tier discount.
- Bulk quantity discount.
- Reward points.
- Deposit (sweets / library / large-cake).
- Delivery fee, surge, perishable surcharge.
- Tip, charity, gift premium.
- Wallet split, Tayseer credit usage, change-jar.
- Tax (currently zero, but no field reserved).

The grand total written to `master_orders.total_amount` is therefore **subtotal-only** and diverges from what the customer saw in the cart UI. Reconciliation, refunds, and accounting all inherit this drift.

---

## 3. Constitutional Vulnerabilities (Article 12.1)

| # | Violation | Evidence | Severity |
|---|---|---|---|
| V1 | **Client-trusted modifiers.** Discounts, deposits, delivery, tips never re-validated server-side. | `process_checkout_sovereign` ignores `delivery_info.total`. | 🔴 Critical |
| V2 | **No `ProductFinancialDNA` contract.** Pricing inputs (cost, margin floor, tax class, deposit policy, allowed discount %) are scattered across `salsabil_financial_contracts`, ad-hoc rules in `custom-fulfillment-rules.ts`, and hard-coded constants in UI hooks. | `useCartCalculations.ts` lines 60-66, 91-115. | 🔴 Critical |
| V3 | **Math runs inside React hooks** (`useCartCalculations`, `useCartOrchestrator`). Cannot be invoked from edge functions, cron, audit, or refund flows without ripping it out. | Whole `useCartCalculations.ts`. | 🟠 High |
| V4 | **Two parallel engines.** Legacy `useCartCalculations` is the source-of-truth; new `PricingEngine` runs in shadow-log mode (`[pricing-shadow]`). Drift not yet enforced. | `useCartCalculations.ts` lines 199-244. | 🟠 High |
| V5 | **No CartSnapshot artifact.** No serializable, hash-able receipt of the calculation passed to the server. Refunds and dispute audits have no canonical record. | n/a (absence). | 🟠 High |
| V6 | **Scattered duplicates.** POS, admin invoice builder, and bundle sheets re-implement subsets of line math. | §2.2. | 🟡 Medium |
| V7 | **Rounding non-determinism.** `pricingEngine.ts` rounds per-line; `useCartCalculations` rounds at totals; SQL uses `numeric(14,2)`. Three rounding regimes → off-by-one in receipts. | `lib/pricingEngine.ts:round`, RPC `numeric(14,2)`. | 🟡 Medium |
| V8 | **Append-only audit gap.** No `cashier_calculations` ledger. The shadow log is `console.info` only. | `useCartCalculations.ts` line 230. | 🟡 Medium |

---

## 4. Surgical Strategy — Introducing Layer-4 `CashierBrain`

### 4.1 Target architecture
```
┌────────────────────────────────────────────────────────────────┐
│  Layer 4 — Pure Domain                                         │
│  ┌──────────────────────────┐   ┌─────────────────────────┐    │
│  │ ProductFinancialDNA      │   │ CashierBrain            │    │
│  │ (cost, tax_class,        │──▶│ calculate(items, dna,   │    │
│  │  margin_floor, deposit,  │   │           context)      │    │
│  │  discount_caps, tier_px) │   │  → CartSnapshot         │    │
│  └──────────────────────────┘   └────────────┬────────────┘    │
└──────────────────────────────────────────────┼─────────────────┘
                                               │
            ┌──────────────────────────────────┼────────────────────────────┐
            ▼                                  ▼                            ▼
   Layer 3 — Gateway              Layer 2 — Server Fn / RPC      Layer 1 — UI
   `cashier.functions.ts`         `process_checkout_sovereign`   `useCashierSnapshot`
   • previewCashierFn             • re-runs CashierBrain on      • thin React Query hook
   • commitCashierFn                authoritative DNA            • returns CartSnapshot
                                   • compares to client snapshot   for display
                                   • rejects on hash mismatch
```

### 4.2 Contracts (proposed, not implemented)

```ts
// src/core/cashier/domain/types.ts
export type ProductFinancialDNA = {
  product_id: string;
  base_price: number;              // canonical EGP (no modifiers)
  cost_price: number | null;       // for margin floor enforcement
  tax_class: "standard" | "zero" | "exempt";
  deposit_policy: { kind: "none" | "percent" | "absolute"; value: number } | null;
  discount_cap_pct: number;        // max stackable discount allowed
  loyalty_multiplier: number;      // points per EGP earned
  vendor_id: string | null;
  contract_version: string;        // for audit
};

export type CashierLineInput = {
  product_id: string;
  qty: number;
  modifiers?: Modifier[];          // re-uses lib/pricingEngine.Modifier
};

export type CashierContext = {
  customer_tier: "guest" | "bronze" | "silver" | "gold" | "vip";
  zone_id: string | null;
  delivery_method_id: string | null;
  promo_code: string | null;
  tip: number;
  charity: number;
  is_gift: boolean;
};

export type CartSnapshot = {
  snapshot_id: string;             // uuid
  computed_at: string;
  input_hash: string;              // sha256 over (lines + dna + context)
  lines: Array<{
    product_id: string;
    qty: number;
    unit_price: number;
    line_subtotal: number;
    line_discount: number;
    line_deposit: number;
    line_tax: number;
    line_total: number;
    applied_modifiers: Modifier[];
  }>;
  totals: {
    subtotal: number;
    discount: number;
    deposit: number;
    delivery: number;
    tax: number;
    tip: number;
    charity: number;
    grand: number;
  };
  rewards: { points_earned: number };
  guardrails: { violations: string[]; blocks_checkout: boolean };
};
```

### 4.3 Migration phases (each independently shippable)

| Phase | Action | Risk |
|---|---|---|
| **C1** | Create `src/core/cashier/domain/{types.ts,CashierBrain.ts}` — pure functions, zero deps on React or Supabase. Port logic from `pricingEngine.ts` + `useCartCalculations.ts`. | 🟢 Additive |
| **C2** | Materialize `ProductFinancialDNA` view: SQL view over `salsabil_financial_contracts` + `products` + `custom-fulfillment-rules`. Surface via `cashierDnaQueries.ts`. | 🟢 Additive |
| **C3** | Create gateway `src/core/cashier/gateway/cashier.functions.ts` with `previewCashierFn`. Add `useCashierSnapshot` hook running it in **shadow mode** alongside legacy `useCartCalculations` (replace existing `[pricing-shadow]` console log). | 🟢 Additive |
| **C4** | Add `cashier_snapshots` append-only audit ledger (Article 7.1 compliant). Insert one row per preview + commit. | 🟢 Additive |
| **C5** | Modify `process_checkout_sovereign` to accept `client_snapshot_hash` + `client_snapshot_id`. Server re-runs CashierBrain logic (PL/pgSQL port OR edge function bridge) and rejects checkout on hash mismatch. | 🟠 Behavioral — feature-flagged |
| **C6** | Flip source-of-truth: `useCartCalculations` becomes a thin adapter over `CashierBrain` snapshot. Delete shadow log. | 🟠 Behavioral |
| **C7** | Refactor POS, admin invoice, basket sheets to consume `CashierBrain.previewLine(...)`. Delete duplicate math. | 🟡 Cleanup |
| **C8** | Decommission `useCartCalculations` math; keep only state plumbing. | 🟡 Cleanup |

### 4.4 Hard invariants (Article 12.1)

1. **Determinism** — `CashierBrain.calculate(x) === CashierBrain.calculate(x)` for any `x`. No `Date.now()`, no `Math.random()`, no I/O.
2. **Same-bytecode rule** — the function MUST be importable from both browser bundle and edge-function bundle. No `react`, no `supabase` imports.
3. **Server is final arbiter** — client snapshot is a hint; server re-derivation wins on conflict.
4. **Append-only audit** — every snapshot (preview & commit) lands in `cashier_snapshots` with `input_hash`, `output_hash`, `dna_version`. No mutations, no deletes.
5. **DNA immutability per snapshot** — snapshots reference `dna.contract_version` so a later contract change cannot retroactively alter a historical receipt.

---

## 5. Files Inventoried (for Phase C1 surgical lifts)

**Lift into `CashierBrain` core:**
- `src/lib/pricingEngine.ts` — already pure; becomes the `Modifier` primitive layer.
- `src/core/engine/pricing/PricingEngine.ts` + `strategies/*` + `discounts/*` + `rewards/*` — strategy registry; becomes CashierBrain's plugin host.
- `src/lib/custom-fulfillment-rules.ts` (computeSweetsRules, deposit thresholds).
- `src/core-os/barq-logistics/core/quote.ts` (delivery fee).
- `src/apps/.../cart/hooks/useFakkaCalculator.ts` (change-jar rounding).

**Demote to thin React adapters:**
- `src/apps/.../cart/hooks/useCartCalculations.ts`
- `src/apps/.../cart/hooks/useCartOrchestrator.ts` (pricing portion only)

**Quarantine for C7 cleanup pass:**
- `src/apps/.../pos/hooks/usePosEngine.ts`
- `src/apps/.../admin/components/PurchaseInvoiceBuilder.tsx`
- `src/core/runtime-ui/blocks/{product,commerce}/*-sheet.tsx`

---

## 6. Recommendation

Proceed to **Phase C1** — scaffold `src/core/cashier/domain/{types.ts,CashierBrain.ts}` and the `ProductFinancialDNA` contract. Zero UI breakage, zero RPC change, additive only. The shadow-log infrastructure already in `useCartCalculations.ts` is the perfect on-ramp.

**Halt here for architectural approval.**
