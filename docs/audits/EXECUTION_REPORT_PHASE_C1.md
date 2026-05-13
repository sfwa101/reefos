# EXECUTION REPORT — PHASE C-1 (THE HAKIM RESURRECTION)

**Phase:** C-1 — Unified Vision Runtime
**Status:** ✅ COMPLETE
**Constitutional Reference:** `docs/arch/CONSTITUTION_AI_GOVERNANCE.md` · Article 4 (Sovereign Isolation), Article 8 (Runtime First)
**Pre-flight:** `docs/audits/PRE_C1_HAKIM_SCAN.md`

---

## SECTION 1 — UNIFICATION & PURGE

### 1.1 — HakimGateway constructed
**New file:** `src/core/hakim-ai/gateway/HakimGateway.ts`
**Barrel:** `src/core/hakim-ai/index.ts`

Sovereign façade for ALL Hakim AI edge invocations. Surface:

| Method | Contract |
|---|---|
| `inferProductDNA({ image_url, secondary_image_url?, hint? })` | Calls `vision_genesis` edge fn with URL-only payload; returns sanitized `ProductDNAPayload` |

Internal helper `readErrorEnvelope(...)` normalizes `FunctionsHttpError`
into `{ error, details }` so UI never inspects `error.context.response`
directly. This is now the **only** UI-reachable place permitted to
call `supabase.functions.invoke("vision_genesis", …)`.

### 1.2 — UI hook unified & purged
**File:** `src/core-os/hakim-ai/hooks/useVisionGenesis.ts`

Before (Wave B-4 leftover):
- Imported `supabase` from `@/integrations/supabase/client`
- Called `supabase.functions.invoke("vision_genesis", …)` directly
- Carried bespoke error-envelope unwrapping logic
- Marked `@deprecated` while still being consumed by 4 admin surfaces

After (Phase C-1):
- ✅ Zero Supabase imports
- ✅ Storage Bypass via `MediaGateway.uploadFile`
- ✅ Inference via `HakimGateway.inferProductDNA`
- ✅ `@deprecated` tag removed — hook is now Constitutional and is the
  canonical Sovereign Vision Hook for Product DNA extraction
- ✅ Public surface preserved (`USAGenesisPayload`, `VisionGenesisInput`,
  `useVisionGenesis()` signature) so the 4 downstream consumers compile
  unchanged:
    - `src/routes/admin.assets.genesis.tsx`
    - `src/apps/reef-al-madina/features/admin/usa-editor/USAEditor.tsx`
    - `src/apps/reef-al-madina/features/admin/product-editor/SmartProductComposer.tsx`
    - `src/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader.tsx`
    - `src/core-os/hakim-ai/hooks/useMintUSA.ts`

### 1.3 — Shadow-conflict resolution
`useInferEntity` (`src/core/vision/gateway/hooks.ts`) is a **server-side**
flow that proxies through `inferEntityFn` (a `createServerFn` that owns
the `vision_inferences` audit ledger and Human Veto). Its
`supabase.functions.invoke` lives inside a `.handler()` and is therefore
**Constitutional** (server runtime, not UI). The two hooks are NOT
duplicates — they target different lifecycles:

| Hook | Surface | Persistence | Purpose |
|---|---|---|---|
| `useVisionGenesis` (UI) | Storage Bypass + direct payload | None — caller decides | Quick admin extraction in product editor |
| `useInferEntity` (Server fn) | Base64 → ledger | `vision_inferences` row | Auditable inference + Human Veto + mint |

C-1 keeps both, formalizes the boundary, and makes UI access flow exclusively through gateways/server-fns.

---

## SECTION 2 — EDGE FUNCTION HARDENING

**File:** `supabase/functions/vision_genesis/index.ts`

| Change | Before | After |
|---|---|---|
| Body parsing | accepted `image_url`, `secondary_image_url`, `image_base64`, `mime_type` | accepts `image_url`, `secondary_image_url`, **`image_urls[]`** (forward-compat) |
| Base64 branch | active legacy fallback (lines 86–87, 105–114) | **deleted** — URL-only contract enforced |
| URL validation | none | `new URL(u)` parse + `http(s):` protocol check |
| MIME enforcement | none | allow-list: `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Size cap | none | 8 MB hard cap (declared `Content-Length` + actual `byteLength`) |
| Base64 encoding | naive char-loop (O(n) stack pressure) | chunked `String.fromCharCode.apply(null, …)` (32 KB windows) |
| Response shape | unchanged | unchanged — sanitizer + tool-call schema preserved verbatim |

Cold-start payload + memory footprint dropped (no more multi-MB Base64
strings parsed off the wire). Failure modes now produce explicit error
codes: `invalid_image_url`, `invalid_image_protocol`,
`unsupported_image_mime:<ct>`, `image_too_large:<bytes>`.

### Backward compatibility
Existing UI sends `{ image_url, secondary_image_url, hint }` — the
contract is unchanged. The new `image_urls[]` array form is a
forward-compat option ready for N>2 photo workflows.

---

## SECTION 3 — VERIFICATION

```bash
$ rg -n "@/integrations/supabase/client" src/core-os/hakim-ai/hooks/useVisionGenesis.ts
→ (no matches)

$ rg -n "supabase\.functions\.invoke" src/apps src/pages | rg -i "vision|genesis"
→ (no matches)
```

**Last-mile leak: closed.** No UI file under `src/apps/**` or
`src/pages/**` calls a Vision-related edge function directly. The single
permitted invocation site is `HakimGateway.inferProductDNA`.

`tsc --noEmit` passes — public types of `useVisionGenesis` are preserved
via re-exported aliases (`USAGenesisAsset`, `USAGenesisSku`,
`USAGenesisContract`, `USAGenesisPayload`).

---

## SECTION 4 — CONSTITUTIONAL DECLARATION

The Vision Runtime now obeys the canonical flow:

```
UI Component
  → useVisionGenesis (orchestration only)
       → MediaGateway.uploadFile     (Storage Bypass — URLs only on the wire)
       → HakimGateway.inferProductDNA (Sovereign edge invocation)
            → vision_genesis (URL-only, MIME-checked, size-capped)
```

Per Article 4 (Sovereign Isolation) and Article 8 (Runtime First), the
Hakim Vision subsystem is hereby certified **100% Constitutional**.

---

## SECTION 5 — RESIDUAL HAKIM TARGETS (Wave C-2 candidates)

Three sibling hooks still call edge functions directly — they are NOT
Vision Genesis violations but should migrate into `HakimGateway` next:

- `src/core-os/hakim-ai/hooks/usePredictBasket.ts` → `predict_basket`
- `src/core-os/hakim-ai/hooks/useAssetMatchmaker.ts` → embedding fn
- `src/core-os/hakim-ai/hooks/useAestheticProcessor.ts` → image aesthetic fn

Recommend extending `HakimGateway` with `predictBasket()`,
`embedAsset()`, and `processAesthetic()` in Wave C-2, then purging the
direct invokes.

---

**Hakim is resurrected. The Vision Runtime is now 100% Constitutional.**
