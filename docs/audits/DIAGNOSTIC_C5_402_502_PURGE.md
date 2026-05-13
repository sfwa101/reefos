# DIAGNOSTIC C-5 — 402 & 502 FATALITY PURGE

**Status:** Complete · Sovereign safety net active.

## 1. 502 Bad Gateway → readable 200 (`vision_genesis`)

- The outer `Deno.serve` callback was already wrapped in `try/catch`, but the
  catch path returned **HTTP 500** and the "all providers failed" branch
  returned **HTTP 502**. Both surfaced to the browser as opaque non-2xx
  errors (`Edge Function returned a non-2xx status code`).
- **Fix:** both branches now return **HTTP 200** with `{ ok: false,
  critical_crash, stack }` (or `{ ok: false, error, attempts }`).
  The Deno isolate can no longer present as a 502 — every failure is now
  a readable JSON document the UI can render.

## 2. 402 Payment Required → soft-disabled (`hakim-pulse`, `process_image_aesthetic`)

Both functions still pointed at `ai.gateway.lovable.dev`, which now returns
**HTTP 402** on this account (token tax exhausted). They were polluting the
console and cascading into UI crashes.

- **`hakim-pulse`** rewritten to a thin shim that returns
  `{ insights: {}, disabled: true }` (batched mode) or
  `{ pulse: "", disabled: true }` (legacy mode) with HTTP 200.
- **`process_image_aesthetic`** rewritten to return
  `{ ok: false, disabled: true, reason: "aesthetic_pipeline_offline" }`
  with HTTP 200.

Both are explicitly marked as **TEMPORARILY DISABLED** in the source. Future
sovereign migration target: `Deno.env.get("Gemini")` / `OpenRouter`.

## 3. Vision Genesis import & casing audit

- Imports verified: only `@supabase/supabase-js@2.45.0`. No missing modules.
- Schema converter `toGeminiSchema` already strips `additionalProperties`
  and `null`-typed enums (Phase C-4 fix).
- Body parsing guarded by `await req.json().catch(() => ({}))`.

## Outcome

**Fatalities addressed. Global safety net active. If a crash happens, it will now print locally.**
