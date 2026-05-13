# PRE-C1 HAKIM SCAN — Vision Genesis Storage Bypass Readiness

**Mode:** READ-ONLY · **Wave:** C-1 (The Hakim Resurrection — pre-flight)
**Constitutional Reference:** `docs/arch/CONSTITUTION_AI_GOVERNANCE.md` · Article 2 (Mandatory Audit Before Build)

---

## 1. The Patient — `src/core-os/hakim-ai/hooks/useVisionGenesis.ts`

### Status
- **Already on Storage Bypass.** File header explicitly states "Phase N-6 — Storage Bypass edition. No more base64 in the HTTP body."
- **Marked `@deprecated`** in favor of Vision Cortex (`@/core/vision/gateway/hooks#useInferEntity`). Live consumers should be re-routed before resurrection.

### Dependencies (mapped)
| Import | Purpose | Constitutional? |
|---|---|---|
| `@tanstack/react-query` (`useMutation`) | Async surface | ✅ |
| `@/integrations/supabase/client` (`supabase`) | `supabase.functions.invoke("vision_genesis", …)` | ⚠️ **DIRECT SUPABASE IMPORT** |
| `@/core/media` (`MediaGateway`) | Staging upload + public URL | ✅ |

### Verdict — Sovereign Isolation
**NOT 100% free of direct Supabase imports.** One residual coupling remains:

```ts
import { supabase } from "@/integrations/supabase/client";
…
const { data, error } = await supabase.functions.invoke("vision_genesis", { body: { … } });
```

This is a **`functions.invoke` leak**, not a DB/storage leak. Per Wave B-5
report, edge-function invocation façades are a Wave C target — this file is
exactly the kind of residual the next wave is meant to extract into a
`HakimGateway` / `VisionGateway`.

### Internal flow (current)
1. Validate `file` (+ optional `secondaryFile`).
2. `uploadToStaging(file)` → `MediaGateway.uploadFile({ bucket: "product-images", path: "vision-staging/<ts>-<rand>-<safeName>", upsert: false })`.
3. Same for `secondaryFile` if provided.
4. `supabase.functions.invoke("vision_genesis", { body: { image_url, secondary_image_url, hint } })`.
5. Bespoke `readErrorBody` shim that tries `error.context.response.clone().text()` → JSON.

---

## 2. The Tool — `src/core/media/gateway/MediaGateway.ts`

### Surface (verified)
| Method | Signature | Multi-image ready? |
|---|---|---|
| `uploadFile({ bucket, path, file, contentType?, upsert? })` | Returns `{ path, publicUrl }` | ✅ — pure per-call; safe to invoke N times in parallel/serial |
| `getPublicUrl(bucket, path)` | Returns `string \| null` (sync) | ✅ |
| `getSignedUrl(bucket, path, ttl)` | Returns `string \| null` | ✅ (not needed for `product-images` — public bucket) |
| `deleteFile(bucket, paths)` | Accepts `string \| readonly string[]` | ✅ — useful for staging GC later |

### Observations
- Each call performs `upload` + `getPublicUrl(path)` on the SAME bucket — exactly what the Bypass needs.
- **No batching primitive** (`uploadFiles([…])`). For 3+ images Hakim will issue N sequential awaits in `useVisionGenesis`. Acceptable for surgery; future C-1 polish could add `MediaGateway.uploadMany`.
- `upsert` defaults to `false` — current staging path uses `Date.now()-<rand>-<name>` so collisions are statistically impossible. ✅
- Public-URL contract: returns `null` if the bucket is private. The hook already throws `storage_public_url_missing` defensively. ✅

### Verdict
**READY for multi-image processing.** No changes needed in the gateway for C-1.

---

## 3. The Target — `supabase/functions/vision_genesis/index.ts`

### Body-parsing contract (current)
```ts
const { image_url, secondary_image_url, hint, image_base64, mime_type } =
  await req.json().catch(() => ({}));
```
Branching:
- `image_url: string` → `urlToDataUrl(image_url)` (fetch → base64 → data URL fed to Gemini).
- Else `image_base64` (legacy) → direct data URL.
- Else → `400 missing_image`.

`secondary_image_url` is honored independently. Both URLs are converted to data URLs **inside the function** before being passed as `image_url` parts to the Lovable AI Gateway (`google/gemini-2.5-pro`).

### Readiness for `image_url` field
- ✅ `image_url` is the **primary, documented path** (lines 81-104).
- ✅ `secondary_image_url` accepted (lines 82, 116-119).
- ⚠️ **No `image_urls: string[]` field.** Only one primary + one secondary. If C-1 wants N-image ingestion, the function contract must be widened.
- ⚠️ Legacy `image_base64` / `mime_type` branch still present (lines 86-87, 105-114). Comment marks it for removal — purge candidate.

### Auth & infra notes
- Uses `createClient` from `https://esm.sh/@supabase/supabase-js@2.45.0` — verified-by-token (anon key + Authorization header). `Deno.serve` style. Returns `401 unauthorized` for unauth callers. ✅
- Reads `SUPABASE_PUBLISHABLE_KEY` then falls back to `SUPABASE_ANON_KEY`. ✅
- Requires `LOVABLE_API_KEY`. Returns `MISSING_API_KEY` (500) if absent.
- CORS: `Access-Control-Allow-Origin: *`, OPTIONS handled.

### Internal `urlToDataUrl`
```ts
const r = await fetch(u);
if (!r.ok) throw new Error(`fetch_image_failed:${r.status}`);
```
- ✅ Honors `content-type` header.
- ⚠️ **No size cap / no MIME allow-list.** A malicious public URL could hand back a huge payload or a non-image type. C-1 should add a Content-Length / Content-Type guard before resurrection ships to production.
- ⚠️ Builds the base64 string via `String.fromCharCode` loop — fine for typical product photos (≤ ~5 MB) but O(n) memory and may stall on a 20 MB image. Consider chunked `btoa` or `base64-js`.

---

## 4. Legacy Friction & Risk Register

| # | Friction | Severity | Recommended C-1 action |
|---|---|---|---|
| F1 | `useVisionGenesis` still imports `supabase` for `functions.invoke` | Medium | Wrap in a new `HakimGateway.invokeVisionGenesis(payload)` (Wave C target) |
| F2 | Hook is `@deprecated` — Vision Cortex is the new home | High | Confirm whether C-1 surgery happens on the legacy hook or on `useInferEntity` (likely the latter — verify before cutting) |
| F3 | Edge function still accepts `image_base64` legacy branch | Low | Remove after one preview cycle to enforce URL-only contract |
| F4 | Edge function has no `image_urls: string[]` array shape | Medium | If C-1 wants N>2 photos, widen the contract; otherwise the existing `image_url` + `secondary_image_url` is fine |
| F5 | `urlToDataUrl` lacks size/MIME guards | Medium-High | Add `Content-Length` cap (e.g. 8 MB) + allow-list (`image/jpeg`, `image/png`, `image/webp`) inside the function |
| F6 | No batching primitive in `MediaGateway` | Low | Optional `uploadMany([…])` helper for ergonomic Hakim parallel staging |
| F7 | Staging bucket `product-images/vision-staging/*` has no documented GC | Medium | Add a periodic purge (cron / lifecycle policy) to prevent staging-blob accumulation |
| F8 | `readErrorBody` does manual `error.context.response.clone()` casting | Low | Will disappear naturally once `HakimGateway` owns the invoke; gateway can normalize the error envelope |

---

## 5. Surgery Readiness Verdict

| Component | Verdict |
|---|---|
| `MediaGateway` | ✅ **GO** — multi-image safe as-is |
| `useVisionGenesis` body construction | ✅ **GO** — already URL-only on the wire |
| `useVisionGenesis` invocation path | ⚠️ **YELLOW** — needs `HakimGateway` extraction (Wave C scope) |
| `vision_genesis` edge function | ⚠️ **YELLOW** — accepts `image_url`; recommend hardening `urlToDataUrl` and dropping the `image_base64` branch in the same surgical pass |
| Staging bucket lifecycle | ⚠️ **YELLOW** — no GC; non-blocking but should be tracked |

**Overall:** The Storage Bypass plumbing is functionally in place. C-1 is primarily a **constitutional cleanup + hardening** wave, not a green-field build. No blockers.

---

*End of read-only scan. No source files were modified.*
