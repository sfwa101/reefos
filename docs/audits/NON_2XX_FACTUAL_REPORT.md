# NON-2XX FACTUAL REPORT — `vision_genesis` Raw Trace

_Date: 2026-05-13_  
_Mode: trace-only / no application fix shipped_

## 0. Scope

This report documents only facts observed from source inspection, direct HTTP calls, and available logs. No product code was modified for a fix.

---

## 1. Client Payload Size Verification

**File inspected:** `src/core-os/hakim-ai/hooks/useVisionGenesis.ts`

### Observed encoding path

The client does **not** send the original `File` bytes directly to `supabase.functions.invoke`.

Observed implementation facts:

- `MAX_EDGE = 1024`
- `JPEG_QUALITY = 0.7`
- `fileToBase64(file)` first attempts `createImageBitmap(file)`.
- If `createImageBitmap` works, the file is drawn to a `<canvas>` at max 1024px longest edge.
- The canvas is exported with:
  - MIME: `image/jpeg`
  - quality: `0.7`
- The base64 sent to the function is read from the compressed `blob` via `reader.readAsDataURL(blob)`.

### Important fallback fact

There is one `reader.readAsDataURL(file)` call, but it is inside the fallback decoder path only. It is used to load the original image into an `HTMLImageElement` when `createImageBitmap` fails. The code still redraws that decoded image to canvas and sends `reader.readAsDataURL(blob)`, not the original file data URL.

### Payload size calculation facts

Measured/minimal trace payload:

- minimal test body bytes: `92`
- minimal test `image_base64` chars: `12`

Base64 expansion math for user-stated file size:

- `50,000` binary bytes → approximately `66,668` base64 chars
- JSON body with one image at that size → approximately `66,748` bytes
- `51,200` binary bytes → approximately `68,268` base64 chars
- JSON body with one image at that size → approximately `68,348` bytes

**Factual conclusion:** the checked source code compresses before sending. A 50KB uploaded image would produce a small JSON payload, not a multi-megabyte body. The user's exact browser request body was not present in the captured network snapshot, so the exact live payload from their click was not observed.

---

## 2. Raw Edge Function HTTP Trace — Supabase-JS Bypassed

Direct HTTP call target:

```text
https://nymzeuaohwfisjvesumx.supabase.co/functions/v1/vision_genesis
```

Direct request body:

```json
{"image_base64":"iVBORw0KGgo=","mime_type":"image/png","hint":"trace audit minimal payload"}
```

Direct request method:

```text
POST
```

Direct request headers included:

```text
Authorization: Bearer <public anon key>
apikey: <public anon key>
Content-Type: application/json
```

### Exact raw response captured via direct `fetch`/HTTP call

```json
{
  "status": 401,
  "headers": {
    "Date": "Wed, 13 May 2026 12:35:46 GMT",
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Server": "cloudflare",
    "Vary": "Accept-Encoding",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "x-deno-execution-id": "f65ef19e-9c12-4675-a2b6-52eb69ce7f46"
  },
  "body": "{\"error\":\"unauthorized\"}"
}
```

### Exact raw response captured via Edge curl tool

```text
status code 401
body {"error":"unauthorized"}
```

**Factual conclusion:** the directly observed non-2xx response body is:

```json
{"error":"unauthorized"}
```

The response includes CORS headers and `Content-Type: application/json`.

---

## 3. Edge Function Source Control Flow Facts

**File inspected:** `supabase/functions/vision_genesis/index.ts`

Relevant observed flow:

1. `OPTIONS` returns CORS headers.
2. Runtime reads:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`
   - `LOVABLE_API_KEY`
3. If `LOVABLE_API_KEY` is missing, code returns:

```json
{"error":"MISSING_API_KEY","details":"LOVABLE_API_KEY is not configured in Edge Function secrets."}
```

4. Before parsing the request body, the function performs an auth gate:

```ts
const authHeader = req.headers.get("Authorization") ?? "";
const userClient = createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: authHeader } },
});
const { data: userData, error: userErr } = await userClient.auth.getUser();
if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
```

5. Only after auth succeeds does the function parse:
   - `image_base64`
   - `mime_type`
   - `hint`
   - `secondary_image_base64`
   - `secondary_mime_type`

**Factual conclusion:** the captured direct trace did not reach body validation, AI gateway call, JSON parsing, or Zod/schema-equivalent sanitization. It stopped at the auth gate with `401 {"error":"unauthorized"}`.

---

## 4. Edge Function Logs

Edge function log pull for `vision_genesis` returned only boot/shutdown lifecycle records in the available window:

```text
2026-05-13T12:33:27Z LOG shutdown
2026-05-13T12:33:26Z LOG shutdown
2026-05-13T12:30:07Z LOG booted (time: 31ms)
2026-05-13T12:30:06Z LOG booted (time: 31ms)
2026-05-13T12:29:08Z LOG shutdown
2026-05-13T12:25:48Z LOG booted (time: 25ms)
2026-05-13T12:25:47Z LOG shutdown
2026-05-13T12:25:47Z LOG booted (time: 32ms)
```

Filtered log pull for `unauthorized` returned:

```text
No edge function logs matched the search term 'unauthorized'.
```

Function edge analytics query for the known function id returned:

```json
[]
```

**Factual conclusion:** no server crash stack trace was available in the logs for this trace. The directly captured HTTP response is the only observed server error body.

---

## 5. Browser/Preview Signals

Available snapshot checks:

- Network snapshot search for `vision_genesis`: no results.
- Console snapshot search for `Edge Function returned`: no results.
- Runtime error snapshot search for `Edge Function returned`: no results.

**Factual conclusion:** the user's exact failing browser request was not present in the available browser/network/runtime snapshots at audit time.

---

## 6. Determination Matrix

| Question | Factual answer |
| --- | --- |
| Is the checked client source compressing before sending? | Yes. Canvas compression to JPEG, max edge `1024`, quality `0.7`, then base64 from compressed blob. |
| Was the user's exact browser payload captured? | No. No matching `vision_genesis` request existed in the available network snapshot. |
| Was a raw non-2xx body extracted by bypassing `supabase-js`? | Yes. `401` with body `{"error":"unauthorized"}`. |
| Are CORS headers present on the raw error response? | Yes. `Access-Control-Allow-Origin: *` and allowed headers were present. |
| Is missing API key verified by this trace? | No. The observed request stopped at auth before reaching AI key-dependent code. |
| Is quota/AI gateway failure verified by this trace? | No. The observed request stopped at auth before the AI gateway call. |
| Is JSON parse/schema mismatch verified by this trace? | No. The observed request stopped at auth before request-body validation and response parsing. |
| Is Deno runtime crash verified by logs? | No. Logs showed boot/shutdown only; no crash stack was available. |
| Exact observed server error | `401 {"error":"unauthorized"}` |

---

## 7. Final Factual Finding

The only raw server error extracted in this audit is:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
Access-Control-Allow-Origin: *

{"error":"unauthorized"}
```

The trace does **not** factually prove a missing API key, quota exhaustion, schema mismatch, or Deno runtime crash. It factually proves that the audited direct call reached `vision_genesis`, received JSON with CORS headers, and failed at the function's authenticated-user gate.
