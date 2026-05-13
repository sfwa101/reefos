# DIAGNOSTIC C-3 — AI GATEWAY FAILURE & UNIVERSAL COMPRESSION ENGINE

**Mode:** Diagnostic instrumentation + architecture blueprint  
**Scope:** `vision_genesis` upstream AI call + `MediaGateway` compression plan  
**Constraint:** No UI rewrite in this phase.

---

## SECTION 1 — Edge Failure Hypothesis

Phase C-2 correctly removed the Edge-side Base64 memory tumor: `vision_genesis` no longer downloads image bytes into the Deno isolate and now forwards public URLs using the OpenAI-compatible content shape:

```json
{ "type": "image_url", "image_url": { "url": "https://..." } }
```

The remaining failure is now most likely at the AI Gateway/provider boundary, not in storage upload or Edge heap pressure.

### Primary hypothesis

The AI gateway may be rejecting raw `https://` image URLs for the selected vision/tool-call path, even though the payload shape is formally OpenAI-compatible. The underlying model adapter may require one of these instead:

1. A `data:image/jpeg;base64,...` URL in `image_url.url`.
2. A provider-specific Gemini multimodal format after gateway translation.
3. A different model that supports URL-backed vision reliably.

If this hypothesis is true, the upstream response should show a precise validation/provider error such as invalid image URL, unsupported content part, failed media fetch, MIME rejection, or tool-call incompatibility.

### Secondary hypothesis

The `HEAD` pre-flight can also fail before the AI gateway is reached if the storage object or CDN returns missing/incorrect metadata:

- `HEAD` returns non-2xx while `GET` would succeed.
- `Content-Type` is absent or not a supported image MIME.
- `Content-Length` is absent, malformed, or above the configured limit.

The current Edge function already returns `400 invalid_image` for this class of failure. The new C-3 logging specifically instruments the AI gateway request/response path, so future logs can distinguish pre-flight rejection from upstream AI rejection.

### Logging injected

`supabase/functions/vision_genesis/index.ts` now logs:

- Endpoint and model.
- Transport mode: `raw_https_url`.
- Image count and URLs sent.
- Full sanitized request payload shape sent to `https://ai.gateway.lovable.dev/v1/chat/completions`.
- Exact upstream HTTP status.
- Upstream response `Content-Type`.
- Exact upstream response body before parsing.

This will answer the C-3 question directly: whether the AI gateway accepts raw URL vision payloads or requires compressed Base64 data URLs.

---

## SECTION 2 — Universal Client-Side Compression Engine Plan (`MediaGateway`)

The new Constitutional Law should be enforced inside `src/core/media/gateway/MediaGateway.ts`, immediately before any storage upload. That makes `MediaGateway.uploadFile()` the universal compression choke point for manual uploads, AI-generated image blobs, vendor/catalog images, and future callers.

### Target contract

- Max dimensions: `1024px × 1024px` while preserving aspect ratio.
- Preferred output: `image/webp`.
- Fallback output: compressed `image/jpeg` if WebP conversion fails.
- Target size: `< 100KB` for normal image uploads.
- Preserve non-image files unchanged unless the call site explicitly opts into image-only enforcement.
- Never introduce Base64 into the upload path; use `canvas.toBlob()` and upload the resulting `Blob`.

### Proposed internal pipeline

Add private helpers near the top of `MediaGateway.ts`:

1. `isCompressibleImage(file, contentType)`
   - Accepts `image/jpeg`, `image/png`, `image/webp`, and browser-readable image files.
   - Skips SVG/GIF by default unless a later policy explicitly rasterizes them.

2. `loadImageBitmap(file)`
   - Prefer `createImageBitmap(file)` for native browser decoding.
   - Fallback to `HTMLImageElement + URL.createObjectURL(file)` if needed.

3. `drawScaledToCanvas(bitmap, maxDimension = 1024)`
   - Compute scale: `min(1, 1024 / max(width, height))`.
   - Draw to a fixed canvas with the scaled width/height.
   - Use transparent handling for PNG/WebP when possible; JPEG fallback gets a neutral background.

4. `encodeCanvasUnderTarget(canvas)`
   - Try WebP quality ladder: `0.82 → 0.72 → 0.62 → 0.52 → 0.42`.
   - If still above `100KB`, reduce dimensions progressively: `1024 → 896 → 768 → 640` and retry.
   - Fallback to JPEG quality ladder if WebP returns `null` or the browser does not support it.

5. `compressImageForUpload(file, contentType)`
   - Returns `{ blob, contentType, extensionHint, compressed: true, originalBytes, compressedBytes }`.
   - If compression fails, fail closed for vision-critical uploads or fall back to original for explicitly non-critical uploads, depending on a future `compressionPolicy` option.

### Integration point

`uploadFile()` should become:

```ts
const prepared = await prepareUploadBlob(file, contentType);

await supabase.storage.from(bucket).upload(path, prepared.blob, {
  contentType: prepared.contentType,
  upsert: upsert ?? false,
});
```

### Path/extension policy

Because compression may convert `.png` or `.jpg` to `.webp`, the gateway needs a path policy:

- Short term: keep caller-provided path but upload with correct `contentType`. Most storage/CDN clients respect MIME over extension.
- Stronger follow-up: add `normalizeImagePath(path, prepared.contentType)` so compressed images are stored with `.webp` or `.jpg` suffix.

### Observability

Log only safe client-side compression metadata in development:

- Original byte size.
- Compressed byte size.
- Output MIME.
- Output dimensions.
- Compression ratio.

Do not log image contents or Base64 strings.

---

## SECTION 3 — If the AI Gateway Requires Base64

If the new C-3 logs prove the AI gateway rejects raw `https://` URLs and requires `data:image/...;base64,...`, the universal compression layer makes Base64 safe again.

### Why Base64 becomes safe after compression

Before compression:

- A phone image can be `3–8MB`.
- Base64 expands it by ~33%.
- The old Edge function created multiple live copies while converting, pushing memory toward the isolate ceiling.

After client-side compression:

- A compressed image target of `50–100KB` becomes roughly `67–134KB` as Base64.
- Two images remain below a few hundred KB total.
- The Edge function can safely convert only tiny already-compressed blobs if absolutely required.

### Safe fallback architecture

If URL pass-through is rejected, the next phase should not restore the old `urlToDataUrl` tumor. Instead:

1. Compress before upload in `MediaGateway`.
2. Store tiny WebP/JPEG objects.
3. In Edge, fetch only the tiny compressed object with a strict max size such as `150KB`.
4. Convert using a minimal byte-to-Base64 path.
5. Send `data:image/webp;base64,...` or `data:image/jpeg;base64,...` to the AI gateway.

This preserves the constitutional invariant that the system never handles raw camera-size images in server memory, while still allowing a Base64 fallback if the AI gateway/provider requires it.

---

**Diagnostic C-3 Complete. Edge logging active and Compression Engine blueprint is ready.**