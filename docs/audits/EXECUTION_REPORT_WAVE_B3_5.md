# EXECUTION REPORT — WAVE B-3.5: RUNTIME LOGIC EXTRACTION (CHECKOUT PRICING)

**Date:** 2026-05-13
**Wave:** B-3.5 — Checkout Pricing Extraction
**Status:** ✅ COMPLETE
**Constitutional Articles enforced:** 3 (Runtime-First), 4 (Sovereign Isolation), 5 (No Framework Worship)
**Type-check:** `tsc --noEmit` → 0 errors

---

## 1. Constitutional Diagnosis

The Wave B-3 audit flagged a math leak inside the checkout view tree:
inline arithmetic (`baseTotal`, `tipRailTotal`, `charityRailTotal`) and a
raw `Math.round(effectiveGrand)` computation inside the sticky CTA were
embedded directly in `CheckoutSheet.tsx` — a `.tsx` view file.

This violated:
- **Article 3 (Runtime-First):** business arithmetic must originate in the
  Runtime, not the UI.
- **Article 4 (Sovereign Isolation):** the UI is a presentation surface and
  must NOT compute truth; it captures intent and renders Runtime output.

The extraction below restores the boundary.

---

## 2. Extracted Logic

### 2.1 New Sovereign Runtime Module

**File:** `src/core/orders/runtime/CheckoutRuntime.ts` (new)

Pure, stateless, hook-free TypeScript engine. Two exported pure functions:

| Function | Inputs | Output | Purpose |
|---|---|---|---|
| `computeCheckoutRails({ effectiveGrand, tip, charity })` | numbers | `{ baseTotal, tipRailTotal, charityRailTotal }` | Computes the three interlocked running totals shown by the Smart Fakka rails (Tip → Charity). |
| `computeChargeableAmount(effectiveGrand)` | number | number | Centralised final-charge rounding for the sticky CTA pill. Single place to evolve currency / piastre / bankers' rounding. |

Zero React imports, zero hooks, zero I/O. Deterministic — same input ⇒
same output.

### 2.2 Public Surface

**File:** `src/core/orders/runtime/index.ts` (new) — barrel export.
**File:** `src/core/orders/index.ts` (edited) — re-exports `computeCheckoutRails`,
`computeChargeableAmount`, and their types so consumers import from
`@/core/orders` only (no deep paths).

### 2.3 UI Purge

**File:** `src/apps/reef-al-madina/features/cart/components/CheckoutSheet.tsx`

| Before (UI math leak) | After (Runtime call) |
|---|---|
| `const baseTotal = Math.round(o.effectiveGrand - o.tip - o.charity);` | `const { tipRailTotal, charityRailTotal } = computeCheckoutRails({ effectiveGrand, tip, charity });` |
| `const tipRailTotal = baseTotal;` | (returned by engine) |
| `const charityRailTotal = baseTotal + o.tip;` | (returned by engine) |
| `{toLatin(Math.round(o.effectiveGrand))}` | `{toLatin(computeChargeableAmount(o.effectiveGrand))}` |

The view now contains **zero arithmetic operators on monetary values**.

### 2.4 Logic NOT Extracted (already constitutional)

The delivery-fee + grand-total computation already lives in
`useCartOrchestrator` and delegates to the existing
`computeLogisticsQuote()` engine in
`src/core-os/barq-logistics/core/quote.ts`. That engine is pure and
domain-agnostic (Constitution-compliant). The orchestrator hook is the
sanctioned bridge between the Runtime and the React tree, so no further
extraction is required at this wave.

---

## 3. Verification

- `bunx tsc --noEmit` → **0 errors**.
- `rg "Math\.(round|max|min|abs)\b" src/apps/reef-al-madina/features/cart/components/CheckoutSheet.tsx` → no matches on monetary expressions.
- Behaviour parity: the rail anchors and CTA pill render identical numbers
  to the pre-purge implementation (deterministic equality of formulas).

---

## 4. AI Suggestions — Wave B-4 (Media & Storage Gateway)

The next most critical legacy layer is **direct Supabase Storage access
from UI / hooks**. The Wave A scan flagged ~6 files calling
`supabase.storage.from(...)` directly:

| File | Concern |
|---|---|
| `src/hooks/useProductImageUpload.ts` | Direct upload + `getPublicUrl` from a hook. |
| `supabase/functions/vision_genesis/index.ts` | OK (server), but client-side companions still hit storage. |
| `src/components/admin/**` (image pickers) | Direct bucket reads/writes. |
| `src/core-os/hakim-ai/hooks/useVisionGenesis.ts` | Storage Bypass already partially in place — needs a Gateway façade. |

### Proposed Wave B-4 plan

1. **Construct `MediaGateway`** at `src/core/media/gateway/MediaGateway.ts`
   exposing four methods only:
   - `uploadProductImage(file, opts)` → `{ assetId, publicUrl }`
   - `getSignedUrl(path, ttlSec)` → `string`
   - `deleteAsset(assetId)` → `void`
   - `listBucketAssets(prefix, limit)` → `MediaAssetVM[]`
2. **Define `MediaAssetVM`** as the only shape the UI sees — never raw
   Supabase storage `FileObject`.
3. **Purge** every `supabase.storage` import outside the Gateway.
4. **Verify** with `tsc --noEmit` and add a `rg` guard to CI.
5. **Report** in `EXECUTION_REPORT_WAVE_B4.md` with the same structure.

After Wave B-4, the only remaining infections are inventory mutations
(Wave B-5) and the legacy admin grids (Wave B-6 — likely a constitutional
exemption since they sit behind RoleGuard).

---

**Wave B-3.5 Complete. Pricing logic extracted to the Sovereign Runtime. Standing by for Wave B-4 (Media).**
