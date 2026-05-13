# EXECUTION REPORT — WAVE B-4: MEDIA GATEWAY (+ B-3.5 RECONCILIATION)

**Date:** 2026-05-13
**Wave:** B-4 — Media & Storage Gateway
**Status:** ✅ COMPLETE
**Constitutional Articles enforced:** 4 (Sovereign Isolation), `SUPABASE_SOVEREIGNTY` §3 (Gateway Pattern), §10 (Forbidden Patterns)
**Type-check:** `bunx tsc --noEmit` → 0 errors

---

## 0. Constitutional Reprimand — Acknowledged

The previous loop (Wave B-3.5) committed code without producing
`EXECUTION_REPORT_WAVE_B3_5.md` in the same response, violating the
"Mandatory Reporting" directive issued during Wave B-3. The lapse is
acknowledged. From this wave forward, **no purification cycle terminates
without its execution report**. The reconciliation for B-3.5 is captured
inline below (Section 1).

---

## 1. Reconciliation — What Wave B-3.5 Actually Extracted

| Artefact | Path | Purpose |
|---|---|---|
| **CheckoutRuntime** (new) | `src/core/orders/runtime/CheckoutRuntime.ts` | Pure, hook-free engine. Two functions: `computeCheckoutRails({ effectiveGrand, tip, charity })` returns the three interlocked Smart Fakka totals; `computeChargeableAmount(effectiveGrand)` centralises CTA-pill rounding. |
| **Runtime barrel** (new) | `src/core/orders/runtime/index.ts` | Re-exports the two functions and their types. |
| **Domain barrel** (edited) | `src/core/orders/index.ts` | Re-exports the runtime helpers so consumers import from `@/core/orders` only. |
| **CheckoutSheet view** (edited) | `src/apps/reef-al-madina/features/cart/components/CheckoutSheet.tsx` | Inline `Math.round(o.effectiveGrand - o.tip - o.charity)` and `Math.round(o.effectiveGrand)` arithmetic deleted. View now calls `computeCheckoutRails()` and `computeChargeableAmount()`. **Zero arithmetic operators on monetary values remain in the .tsx.** |

A standalone post-hoc report file was already generated at
`docs/audits/EXECUTION_REPORT_WAVE_B3_5.md` for the longform record.

---

## 2. Wave B-4 — Media Gateway Execution

### 2.1 New Sovereign Module

**File:** `src/core/media/gateway/MediaGateway.ts` (new)

Centralised façade over Lovable Cloud storage. `supabase.storage.from(...)`
is now constitutionally constrained to this single file. Exposed surface:

| Method | Signature | Purpose |
|---|---|---|
| `uploadFile` | `(input: UploadFileInput) => Promise<UploadFileResult>` | Upload a `Blob`/`File` to a named bucket+path. Returns `{ path, publicUrl }`. Honours `upsert` and `contentType`. |
| `getPublicUrl` | `(bucket, path) => string \| null` | Resolve a public URL synchronously for public buckets. |
| `getSignedUrl` | `(bucket, path, ttlSeconds) => Promise<string \| null>` | Mint time-limited signed URLs for private buckets (e.g. KYC). |
| `deleteFile` | `(bucket, paths) => Promise<void>` | Remove one or more objects from a bucket. |

Errors surface as typed `Error` instances with `media_*_failed` prefixes for
observability mapping.

**File:** `src/core/media/index.ts` (edited) — re-exports `MediaGateway`,
`UploadFileInput`, `UploadFileResult` so consumers import from
`@/core/media` only (no deep paths).

### 2.2 UI / Hook Files Purged

| File | Before | After |
|---|---|---|
| `src/hooks/useProductImageUpload.ts` | Direct `supabase.storage.from("product-images").upload(...)` + `getPublicUrl`. | Delegated to `MediaGateway.uploadFile({ bucket: "product-images", … })`. `supabase` import removed. |
| `src/core-os/hakim-ai/hooks/useVisionGenesis.ts` | Direct staging upload + `getPublicUrl` from a hook. | `uploadToStaging()` now calls `MediaGateway.uploadFile({ bucket: STAGING_BUCKET, … })`. (The hook still imports `supabase` for the legacy `functions.invoke("vision_genesis", …)` call, which is the next migration target → see §3.) |
| `src/pages/account/Verification.tsx` | Two `createSignedUrl()` calls and one `upload()` call against the private `kyc-documents` bucket inline in a `.tsx` view. | Replaced with `MediaGateway.getSignedUrl()` and `MediaGateway.uploadFile()`. Storage I/O excised from the view. |
| `src/core-os/capabilities/identity/KycUpgradeGate.tsx` | Inline `avatars` bucket `upload()` + `getPublicUrl()` inside the submit handler. | Replaced with a single `MediaGateway.uploadFile({ bucket: "avatars", … })` call returning `{ publicUrl }`. |

### 2.3 Files Intentionally Left Alone

| File | Reason |
|---|---|
| `src/lib/library.functions.ts` | TanStack server function (`*.functions.ts`). Per `SUPABASE_SOVEREIGNTY` §3, gateways **and server functions** are the sanctioned hosts of the Supabase client. No purge required. |
| `supabase/functions/**` | Edge functions execute server-side; constitutionally exempt. |

### 2.4 Verification

- `bunx tsc --noEmit` → **0 errors**.
- `rg "supabase\.storage" src` outside `src/core/media/gateway/` and
  `src/lib/*.functions.ts` → **0 matches**. Storage isolation is total.

---

## 3. Strategic Suggestions — Wave B-5 Targets

The Storage front is now closed. The next infections to excise, ranked by
constitutional severity:

### 3.1 Wave B-5 (recommended): Edge-Function Invocation Façade

**Symptom:** Hooks still call `supabase.functions.invoke(...)` directly,
bypassing typed gateway contracts. Notably:

| File | Edge function called |
|---|---|
| `src/core-os/hakim-ai/hooks/useVisionGenesis.ts` | `vision_genesis` |
| `src/hooks/useHakimChatStream.ts` | `hakim-chat` |
| `src/hooks/useHakimPulse.ts` / `src/features/hakim/hooks/useHakimPulse.ts` | `hakim-pulse` |
| `src/hooks/useTayseer*.ts` | `tayseer-oracle` |
| Various others (`predict_basket`, `process_image_aesthetic`, `hakim-advisor`, …) |

**Plan:** introduce per-domain RPC façades (`HakimGateway`,
`TayseerGateway`, `VisionGateway`) that wrap `supabase.functions.invoke`
and return typed VMs. The remaining `supabase` import in
`useVisionGenesis.ts` falls naturally with this wave.

### 3.2 Wave B-6: Direct `supabase.from(...)` reads in legacy hooks/pages

`rg -l "@/integrations/supabase/client" src` flagged ~40 UI / hook files
still doing direct table reads (e.g. `useUserRoles`, `useGeoZones`,
`useFeaturedCategories`, `useSystemSettings`, `useMarketing`, vendor
pages, `useSduiLayout`, `useLayoutEditor`, `useLiveEventStream`,
`useAdmin*Realtime`, `cartSync`, `behavior`, `sovereignCatalog`,
`saved-bundles`, …). These split cleanly into:

- **Identity/role reads** → fold into existing `IdentityGateway`.
- **Catalog/product reads** → new `CatalogGateway` (or extend existing
  `core/catalog`).
- **Realtime subscriptions** → per `SUPABASE_SOVEREIGNTY` §9, must move
  into gateway-owned subscription helpers; UI should consume typed event
  streams only.

### 3.3 Wave B-7 (constitutional exemption review)

`UniversalAdminGrid` and other admin surfaces sitting behind `RoleGuard`
are candidates for an explicit Article-5 exemption rather than a purge —
flag for governance approval, not silent migration.

---

**Wave B-4 Complete. Media Gateway is online. Constitutional reporting protocols have been strictly followed.**
