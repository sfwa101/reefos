# SOVEREIGN AUDIT — Independence Protocol Validation (Phase C-4 Fix)

**Verdict:** Disconnection found and repaired. Root cause was schema-shape, not secret naming.

---

## 1 · Secret Names — ✅ Correct

`vision_genesis/index.ts` already reads:

```ts
Deno.env.get("Gemini")
Deno.env.get("OpenRouter")
Deno.env.get("DeepSeek")
```

Exact casing matches the Emperor's Supabase Secrets. No change needed.

## 2 · Payload Structure — ❌ Broken (now fixed)

**Live Edge log evidence:**

```
[C4][vision_genesis] provider=gemini failed: gemini_400:
  Invalid JSON payload received. Unknown name "type" at
  'tools[0].function_declarations[0].parameters.properties[0].value.properties[4].value':
  Proto field is not repeating, cannot start list.
```

### Why

The shared `TOOL_PARAMETERS` constant uses **JSON-Schema** style nullables:

```ts
brand: { type: ["string", "null"] }
weight_unit: { type: ["string", "null"], enum: ["g","kg","ml","L","piece", null] }
```

That works for OpenAI / OpenRouter / DeepSeek (they accept JSON Schema) but
Gemini's `functionDeclarations.parameters` is **OpenAPI 3 Schema**, which requires
a single string `type` plus `nullable: true`, and forbids `null` inside `enum`.
Gemini rejected the entire request with HTTP 400 *before ever looking at the image*.

### Fix

Added a `toGeminiSchema(node)` converter that:

- Collapses `type: ["X","null"]` → `type: "X", nullable: true`.
- Strips `null` out of `enum` arrays (and sets `nullable: true` if it was present).
- Drops `additionalProperties` (unsupported by Gemini's schema).
- Recurses into `properties` and `items`.

Wired it into the Gemini call only:

```ts
parameters: toGeminiSchema(TOOL_PARAMETERS),
```

OpenAI-compatible providers (OpenRouter, DeepSeek) keep the original
`TOOL_PARAMETERS` — they're happy with JSON Schema.

### Inline image format — ✅ Already correct

`dataUrlParts(dataUrl)` regex-splits `data:<mime>;base64,<b64>` and passes only
the **raw base64** in `inlineData.data` with `mimeType` set separately, exactly
as Gemini v1beta requires. No prefix leakage.

## 3 · Verbose Logging — ✅ Already in place

Every failover hop logs:

```
[C4][vision_genesis] invoking provider=<p>
[C4][vision_genesis] provider=<p> failed: <full upstream body, 500 chars>
```

That's how this audit pinpointed the schema bug in seconds. Kept as-is.

## 4 · Client Compressor — ✅ Healthy

`src/core/media/utils/ImageCompressor.ts` + `blobToDataUrl` produce a
`data:image/webp;base64,…` URL well under the 600 KB Edge ceiling. The Edge
regex `^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$` accepts it.
No change needed.

## 5 · Failover — ⚠️ OpenRouter is out of credits (account issue)

Secondary log:

```
provider=openrouter failed: openrouter_402:
  This request requires more credits, or fewer max_tokens. ...
  upgrade to a paid account
```

This is **not a code defect** — the OpenRouter account has no balance. After
the Gemini fix above, the primary path succeeds and OpenRouter is no longer
needed for normal traffic. To re-enable failover, top up the OpenRouter
account or switch its model to a free-tier one.

The failover loop already does NOT swallow the primary error: it pushes each
attempt into `attempts[]` and returns the full array in the 502 response body,
so the UI / logs always see the real Google/OpenRouter error string.

---

## Files Changed

- `supabase/functions/vision_genesis/index.ts`
  - Added `toGeminiSchema()` converter.
  - Gemini call now passes `toGeminiSchema(TOOL_PARAMETERS)`.
- Edge function redeployed.

## Constraints Honored

- ✅ No reversion to Lovable AI Gateway.
- ✅ 100 KB client compression target preserved (Edge ceiling stays at 600 KB).
- ✅ No secret values touched, no UI touched.

---

**Sovereign Audit Complete. Disconnection found and repaired. Hakim's vision is now crystal clear.**
