# Vision Cortex — Pre-Build Reconnaissance

**Status:** Read-only audit · No code mutated
**Auditor:** Principal Backend Architect
**Reference:** Constitution v2.0 — Article 12.2 (Vision Cortex), Article 8.1 (Human Veto)
**Date:** 2026-05-12

---

## 1. Executive Summary

Three independent legacy surfaces touch the "camera → AI → product" territory. They are **architecturally disjoint** and span shopper search, point-of-sale, and admin minting. The good news: **no surface bypasses the Human Veto into a `usa_products` / `salsabil_assets` table from the client**. The bad news: the admin Genesis flow is a tightly-coupled monolith (`VisionGenesisUploader`) that owns image capture, AI inference, aesthetic processing, image upload, and DB minting in a single ~400-line component, and the barcode infrastructure is duplicated across three call sites with no shared scanner kernel.

Verdict: **Refactor, do not rewrite.** The Vision Cortex (Phase 1) can be slotted in by extracting a shared scanner primitive, repointing the admin uploader at a new `vision-cortex` server function, and leaving shopper/POS scanners untouched.

---

## 2. Inventory of Legacy Surfaces

### 2.1 Camera / Barcode

| Component | Path | Role | Coupling |
|---|---|---|---|
| `useBarcodeScanner` | `src/modules/search/hooks/useBarcodeScanner.ts` | ZXing wrapper (`@zxing/browser`), rear-camera preferred | ✅ Clean primitive |
| `BarcodeScannerSheet` | `src/modules/search/components/BarcodeScannerSheet.tsx` | Fullscreen camera UI for shopper search | ✅ Pure presentation |
| `BarcodeScannerModal` | `src/components/BarcodeScannerModal.tsx` | Global mount; listens to `reef:open-barcode` event, routes to `/search?q=<code>` | ✅ Event-bus driven, decoupled |
| `WalletPosBarcode` | `src/core-os/finance/components/WalletPosBarcode.tsx` | POS / wallet barcode flow | ⚠️ Independent — does not reuse `useBarcodeScanner` |
| `PosBarcodeCart` | `src/apps/reef-al-madina/features/pos/components/PosBarcodeCart.tsx` | POS cart-by-scan | ⚠️ Independent path |
| `ScannerOverlay` | `src/apps/reef-al-madina/features/health-care/components/ScannerOverlay.tsx` | **Placeholder** ("وضع التجربة") — no real camera, toast-only | 🟡 Stub, safe to ignore or unify later |
| File `<input capture="environment">` | inside `VisionGenesisUploader` | Admin "take photo" path for genesis | ⚠️ Bypasses ZXing entirely; uses raw `<input>` |

**Pollution:** Three disjoint camera entry points (shopper ZXing, POS scanner, admin `<input capture>`). Only the shopper path uses the `useBarcodeScanner` primitive. The admin Vision flow is **photo-capture, not barcode-decode** — different concern, but sharing it under one "Vision" capability is desirable.

### 2.2 AI Vision / Product Generation

| Surface | Path | Action | Veto-respecting? |
|---|---|---|---|
| `vision_genesis` edge fn | `supabase/functions/vision_genesis/index.ts` | Reads image → returns inferred USA payload (asset + SKUs + financial contract). **No DB writes.** | ✅ Pure inference |
| `useVisionGenesis` | `src/core-os/hakim-ai/hooks/useVisionGenesis.ts` | Client adapter to the edge fn | ✅ Read-only |
| `useMintUSA` | `src/core-os/hakim-ai/hooks/useMintUSA.ts` | Calls `mint_universal_asset(payload jsonb)` RPC — **only after admin approval click** | ✅ Human Veto preserved |
| `VisionGenesisUploader` | `src/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader.tsx` | Drag/drop + camera + hint → `vision_genesis` → "Genesis Review Board" → user clicks Approve → `useMintUSA` | ✅ Veto in UI; ⚠️ monolithic |
| `SmartProductComposer` | `src/apps/reef-al-madina/features/admin/product-editor/SmartProductComposer.tsx` | Hosts `VisionGenesisUploader` in `handoffOnly` co-pilot mode | ✅ |
| `USAEditor` | `src/apps/reef-al-madina/features/admin/usa-editor/USAEditor.tsx` | Edit existing minted USA records | ✅ |
| `useHakimExecutor` (admin hakim) | `src/apps/reef-al-madina/features/admin/hakim/hooks/useHakimExecutor.ts` | AI-driven admin actions | ⚠️ Audit separately — not in Vision Cortex scope |

**Direct-DB scan:** `rg "insert.*usa_products|insert.*salsabil_assets" src/` returned **zero matches**. All persistence flows through the `mint_universal_asset` RPC, which is invoked only from `useMintUSA` after a user click. **Article 8.1 (Human Veto) is intact.**

---

## 3. Constitutional Compliance Matrix

| Article | Requirement | Current state | Gap |
|---|---|---|---|
| **8.1 Human Veto** | No AI-generated entity persists without human approval | ✅ Vision payload sits in component state until "Approve" click; mint is an explicit RPC call | None |
| **12.2 Vision Cortex** | Single sovereign capability owning image → entity inference, with versioned prompts, audit trail, and replaceable model backend | ❌ No central `VisionCortex` module; logic split between `vision_genesis` edge fn (prompt + Gemini call) and `VisionGenesisUploader` (UI + orchestration); no audit trail of inferences | Build the cortex |
| **Domain Boundaries** | Inference, persistence, and presentation must be separable | ⚠️ `VisionGenesisUploader` couples 4 concerns (capture, infer, aesthetic, upload, mint) | Decompose |
| **Append-only ledger / observability** | Every inference should leave a trace (input hash, model, output, approver) | ❌ No `vision_inferences` table; results are ephemeral | Add ledger |

---

## 4. Identified Pollution

1. **Monolithic uploader.** `VisionGenesisUploader` orchestrates capture, AI call, aesthetic enrichment, image upload, and minting. Hard to swap the AI backend or add review-board UX variants.
2. **Prompt locked inside the edge function.** `vision_genesis/index.ts` (~202 LoC) hardcodes the schema/prompt — not versioned, not testable in isolation, no fallback model.
3. **No inference audit trail.** Approvals/rejections are not recorded — we cannot retrain prompts or measure precision.
4. **Three barcode paths.** Shopper, POS, and Wallet-POS each instantiate their own scanner; only the shopper uses the shared `useBarcodeScanner`.
5. **`ScannerOverlay` stub** in `health-care` advertises a scanner that does nothing — UX debt.
6. **`as any` cast** in `useMintUSA` for the RPC — types are not generated for the function.

None of the above is a security or data-integrity defect; all are **architectural debt** to retire during cutover.

---

## 5. Surgical Replacement Strategy (Phase 1 Vision Cortex)

The cortex will be built **alongside** the legacy stack and the legacy UI repointed at it. No file is deleted in Phase 1.

### Step 1 — Build the Cortex Core (new files, zero impact)
- `src/core/vision/domain/VisionCortex.ts` — pure inference contract: `inferEntity(input: VisionInput): Promise<DraftCivilizationEntity>`. Pluggable model adapter.
- `src/core/vision/domain/types.ts` — `VisionInput`, `DraftCivilizationEntity`, `VisionInferenceTrace`.
- `src/core/vision/gateway/vision.functions.ts` — TanStack server functions: `inferEntityFn` (calls model + writes `vision_inferences` ledger row in `pending` state), `approveInferenceFn` (flips ledger to `approved` + delegates to existing `mint_universal_asset` RPC), `rejectInferenceFn`.
- Migration: `vision_inferences` table (append-only, RLS admin-only) — `id, input_hash, model, prompt_version, raw_output jsonb, draft_payload jsonb, state ('pending'|'approved'|'rejected'), approved_by, approved_at, created_at`.

### Step 2 — Adapter to Legacy Edge Function
- `vision.functions.ts::inferEntityFn` initially proxies to the existing `vision_genesis` edge function (zero behaviour change), then writes the trace row. This lets us cut over without rewriting the prompt.

### Step 3 — Repoint the UI (single-line swap)
- In `VisionGenesisUploader`, replace `useVisionGenesis` → `useInferEntity` (new hook over `inferEntityFn`) and `useMintUSA` → `useApproveInference`. Component shape unchanged.
- `handoffOnly` path in `SmartProductComposer` continues to work.

### Step 4 — Decompose the Monolith (follow-up phase)
- Split `VisionGenesisUploader` into: `<VisionCapture>` (drag/drop/camera), `<VisionReviewBoard>` (read-only display of `DraftCivilizationEntity`), `<VisionApprovalBar>` (Veto controls). Each ≤ 100 LoC.

### Step 5 — Retire Legacy Hooks (only after parity is proven)
- Mark `useVisionGenesis` and `useMintUSA` `@deprecated` and re-export from the new gateway. Delete in a later sweep once no imports remain.

### Step 6 — Barcode Unification (Vision Cortex Part 2, optional)
- Migrate `WalletPosBarcode` and `PosBarcodeCart` onto `useBarcodeScanner`. Replace `ScannerOverlay` stub with the real `BarcodeScannerSheet`. Out of scope for Phase 1 cortex.

---

## 6. Risk & Zero-Breakage Checklist

- ✅ No legacy file modified during recon.
- ✅ Cutover plan is additive: cortex ships, legacy stays, UI swaps imports.
- ✅ Existing `mint_universal_asset` RPC remains the sole writer to `salsabil_assets` — no new write paths introduced.
- ✅ Human Veto preserved: `approveInferenceFn` requires an authenticated admin and an explicit `inference_id` already in `pending` state.
- ✅ Rollback: revert the import swap in `VisionGenesisUploader` to restore legacy behaviour in one commit.

---

## 7. Recommendation

Proceed to **Vision Cortex Phase 1 — Step 1: scaffold `src/core/vision/` and the `vision_inferences` migration**. Defer barcode unification and monolith decomposition to subsequent micro-prompts.

**Awaiting the Emperor's order to begin Step 1.**
