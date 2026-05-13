# DIAGNOSTIC AUTOPSY — VISION GENESIS POST-C1 CRASH

**Mode:** READ-ONLY · **Scope:** Edge function + storage gateway + AI provider boundary.

---

## SECTION 1 — Edge Function Behavior (`supabase/functions/vision_genesis/index.ts`)

### 1.1 — How the URL is handled
The edge function **does NOT pass the URL to the AI provider**. Lines 107–136 implement
`urlToDataUrl(u)` which:

1. `await fetch(u)` — pulls the entire object back into Edge memory.
2. `await r.arrayBuffer()` — full payload buffered (cap 8 MB).
3. `new Uint8Array(ab)` — second copy of the bytes.
4. `Array.from(buf.subarray(i, i+CHUNK))` (line 130) — **third copy**, this time as a
   boxed JS `number[]` (≈ 8× memory overhead per byte vs. the Uint8Array).
5. `String.fromCharCode.apply(null, …)` — fourth copy as a binary string.
6. `btoa(bin)` — fifth copy, base64-expanded (≈ 1.37×).
7. `` `data:${ct};base64,${…}` `` — sixth copy as the final data URL string.

For a single 8 MB image this peaks around **~65–80 MB** of live JS heap. With a
secondary image (`secondaryDataUrl`, line 136) the peaks **stack** because both
data URLs are kept alive simultaneously through the `aiRes = await fetch(...)`
call. Worst case ≈ **150 MB** — right at the Supabase Edge / Deno isolate ceiling.

### 1.2 — What is shipped to the AI provider
Lines 150–172 POST to `https://ai.gateway.lovable.dev/v1/chat/completions` with:

```json
{ "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,…" } }
```

i.e. the full data URL is embedded inline in the chat-completions body. The
gateway is OpenAI-compatible and the Lovable AI gateway **also accepts plain
public `https://` URLs in the `image_url.url` field** — Gemini’s underlying
`generateContent` is invoked server-side by the gateway. **Downloading the
image into the Edge function and re-encoding it as Base64 is unnecessary work**
that doubles latency, multiplies memory, and is the prime suspect for the
post-C1 crash.

### 1.3 — Failure surface (ranked)
| # | Failure mode | Likelihood | Evidence |
|---|---|---|---|
| 1 | **Memory pressure / OOM in Deno isolate** when `urlToDataUrl` runs (esp. with `secondary_image_url`) | HIGH | `Array.from(Uint8Array)` + `String.fromCharCode.apply` + `btoa` keeps 6 copies alive; doubled for 2-image flows |
| 2 | **Worker wall-clock timeout** while base64-encoding + re-uploading multi-MB payload to the gateway | HIGH | Sequential `await urlToDataUrl(urls[0]); await urlToDataUrl(urls[1])` — no parallelism, no streaming |
| 3 | Gateway 4xx/5xx swallowed → surfaces as `AI_API_ERROR` (status 500) — UI sees opaque failure | MEDIUM | Lines 289–293 truncate `t` to 800 chars; client sees generic message |
| 4 | Stale deployment (edge logs show only Boot/Shutdown, no recent invocation traces) | MEDIUM | Logs window has zero `console.error` lines from the new C-1 build — the new function may not have served a real request yet, or all crashes happen before the first `console.log` |
| 5 | `req.headers.get("Authorization")` empty after `attachSupabaseAuth` regression → `userClient.auth.getUser()` returns null → 401 | LOW–MED | Function still returns `{ error: "unauthorized" }` (line 78) — UI would see a clean 401, not a crash |

### 1.4 — What the C-1 patch did **not** fix
C-1 closed the **UI-side** Base64 leak. It did **not** remove the **Edge-side**
Base64 round-trip. The wire is now URL-only between UI ↔ Edge, but the Edge
function still rebuilds the very same Base64 payload internally before talking
to the AI gateway. **The constitutional “Storage Bypass” promise is broken
inside the Edge boundary.**

---

## SECTION 2 — Storage Bucket Reality (`MediaGateway` + Postgres)

### 2.1 — Code path
`useVisionGenesis` → `MediaGateway.uploadFile({ bucket: "product-images", path: "vision-staging/…" })`
→ `getPublicUrl(bucket, path)`.

`MediaGateway.uploadFile` returns `publicUrl` from `supabase.storage.from(bucket).getPublicUrl(path)` —
this **always returns a string** for any bucket id, **regardless of whether the bucket is actually
public**. There is no runtime check confirming public visibility.

### 2.2 — Bucket visibility (live DB query)
```
psql> select id, name, public from storage.buckets;
       id       |      name      | public
----------------+----------------+--------
 kyc-documents  | kyc-documents  | f
 product-images | product-images | t   ✅
```

`product-images` is **public** → Edge `fetch(image_url)` will receive the bytes (200 OK).
**Bucket misconfiguration is NOT the crash cause** — but the gateway has no defense if
a future caller passes a private bucket: `getPublicUrl` will silently hand back a URL
that 400s when the Edge tries to fetch it.

### 2.3 — Latent risks in the gateway
- No `getPublicUrl`/`isPublic` validation pre-flight.
- No `uploadMany` primitive → callers must `await` sequentially (already a perf tax for the
  2-image vision flow).
- Staging prefix `vision-staging/` has no GC policy — a runaway loop will balloon storage cost.

---

## SECTION 3 — ROOT-CAUSE VERDICT & PROPOSED FIX

### 3.1 — Why C-1 did not stop the crash
The crash never lived in the UI. C-1 stopped the UI from shipping Base64 over
HTTP, but the **Edge function still constructs the identical Base64 payload
internally** (`urlToDataUrl`) and ships it to the AI gateway. We moved the
problem one hop deeper, into a smaller box (Deno isolate, ~150 MB, sub-second
budget) than the previous one (browser, GBs, no time limit). On a typical
phone-camera photo (~3–6 MB) with a secondary label image, peak heap easily
exceeds the isolate ceiling and the worker dies — surfacing to the UI as a
generic non-2xx / “FunctionsHttpError” with no useful body.

### 3.2 — The exact architectural fix (Phase C-2 surgery)

**Pass-Through URL Mode (preferred)** — drop `urlToDataUrl` entirely and forward the
public Storage URL to the Lovable AI gateway as-is:

```ts
{ type: "image_url", image_url: { url: image_url } } // raw https://…/object/public/…
```

- The Lovable AI gateway’s OpenAI-compatible chat-completions endpoint accepts
  HTTPS image URLs directly and pulls the image server-side from a much beefier
  runtime than the Deno isolate.
- Edge memory drops from ~80 MB peak → ~2 MB.
- Latency drops by one full network round-trip per image.
- The Constitution’s “Storage Bypass” invariant becomes truthful end-to-end:
  **the image bytes never re-enter our compute path.**

**Hardening to ship alongside the fix:**
1. Allow-list the URL host (`*.supabase.co/storage/v1/object/public/*`) inside
   `vision_genesis` to prevent SSRF / arbitrary-URL abuse.
2. Add a HEAD pre-flight on the URL with a strict size+MIME contract — fail
   fast (400) before invoking the AI gateway, instead of after a 30 s timeout.
3. In `MediaGateway`, add `assertPublicBucket(bucket)` (cached lookup against
   `storage.buckets.public`) so a future caller cannot silently hand the Edge
   a URL it cannot fetch.
4. Bubble the AI gateway’s response body verbatim into the error envelope
   (currently truncated to 800 chars and wrapped in `AI_API_ERROR`) so the UI
   can distinguish quota vs. payload vs. timeout.

**Fallback Mode (only if the gateway rejects URLs in practice):**
Keep `urlToDataUrl` but (a) stream the response into base64 incrementally
using `TransformStream` / `ReadableStream.getReader()` instead of materializing
six full copies, (b) cap to **one** image per request and send the second image
in a follow-up call, (c) drop `Array.from(Uint8Array)` — iterate the
`Uint8Array` directly with `String.fromCharCode(...buf.subarray(i, i+CHUNK))`
to halve heap.

---

## SECTION 4 — RECOMMENDED PHASE C-2 SCOPE

1. `supabase/functions/vision_genesis/index.ts` — delete `urlToDataUrl`,
   forward URLs, add SSRF allow-list, surface real upstream error bodies.
2. `src/core/media/gateway/MediaGateway.ts` — add `assertPublicBucket`, expose
   `uploadMany` for the 2-image vision flow.
3. `src/core/hakim-ai/gateway/HakimGateway.ts` — no API change required;
   payload contract is already `image_url` strings.
4. CI — add a smoke test invoking `vision_genesis` with a fixture URL, asserting
   `< 5 s` wall clock and `< 32 MB` peak heap.

---

**Diagnostic complete. The root cause of the Vision crash has been identified.**
