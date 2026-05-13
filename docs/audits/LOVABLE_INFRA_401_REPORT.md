# LOVABLE INFRA 401 REPORT — `vision_genesis`

**Mode:** Read-only forensic audit.
**Scope:** `supabase/functions/vision_genesis/index.ts`, `supabase/config.toml`, client invocation in `src/core-os/hakim-ai/hooks/useVisionGenesis.ts`.

---

## 1. OPTIONS Preflight Handling — ✅ PRESENT

`supabase/functions/vision_genesis/index.ts:54-55`:

```ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
```

`corsHeaders` (lines 6-9):

```ts
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
```

**Verdict:** Preflight is intercepted at the very top of `serve` and answers `200 OK` with wildcard origin and the headers `supabase-js` actually sends. The browser preflight is **not** the source of the 401.

⚠️ Minor gap: `Access-Control-Allow-Methods` is missing. Browsers usually accept the response anyway because `Access-Control-Allow-Headers` is present, but adding `"POST, OPTIONS"` is best-practice hardening — not the cause of the failure.

---

## 2. The 401 — Function-Level, Not Gateway-Level

The factual capture in `NON_2XX_FACTUAL_REPORT.md` recorded the body:

```
HTTP/1.1 401 Unauthorized
{"error":"unauthorized"}
```

That body exactly matches the function's own response (line 76):

```ts
const { data: userData, error: userErr } = await userClient.auth.getUser();
if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
```

The Supabase API gateway, when blocking a missing/invalid JWT pre-function, returns either `{"code":401,"message":"Missing authorization header"}` or `{"msg":"Invalid JWT"}` — a *different* shape. So:

- **The request reached the function.** (Gateway accepted it.)
- **`supabase/config.toml` does NOT declare `[functions.vision_genesis]`** → Lovable-managed default applies (`verify_jwt = false`), which is consistent with the request reaching the handler.
- **The 401 is thrown by `auth.getUser()` inside the function**, because the bearer token forwarded to the function-scoped client did not validate.

### Why `auth.getUser()` was failing (pre-Phase N-2)

`src/core-os/hakim-ai/hooks/useVisionGenesis.ts` previously called `supabase.functions.invoke("vision_genesis", { body })` with **no explicit `headers.Authorization`**. `supabase-js` only auto-attaches the bearer token when the browser client has a hydrated session AND the function URL is invoked through the same client instance. Under the Lovable preview shell, the auto-attach can race the session restore — which is exactly what the 401 indicates.

Phase N-2 already patched the hook to:

```ts
const { data: { session } } = await supabase.auth.getSession();
...
headers: { Authorization: `Bearer ${session.access_token}` }
```

That should resolve the 401 *for authenticated users*. Any remaining 401 now means the user genuinely has no live Supabase session at the moment of invocation (e.g., logged out, expired refresh token, or running on a public route without auth).

### Server-side fragility

The function reads:

```ts
const ANON_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY")!;
```

In Lovable-managed Edge Functions, `SUPABASE_ANON_KEY` is the canonical env var. `SUPABASE_PUBLISHABLE_KEY` is **not** auto-provisioned. The `||` short-circuit handles this safely *as long as* `SUPABASE_ANON_KEY` is set — which it is by the platform. No action required, but worth noting.

---

## 3. AI Integration — ✅ CORRECT for Lovable Cloud

`vision_genesis` calls the **Lovable AI Gateway** (line 118), not Google directly:

```ts
fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: "google/gemini-2.5-pro", ... tools: [...], tool_choice: {...} })
})
```

- Uses `LOVABLE_API_KEY` (auto-provisioned by Lovable Cloud — verified present-or-MISSING_API_KEY guarded at line 63).
- **Does NOT depend on `GEMINI_API_KEY`.** No external Google key is required.
- Uses tool-calling for structured output (correct pattern per Lovable AI guidelines).
- Handles `429` (rate limit) and `402` (credits exhausted) explicitly with structured details.
- `model: "google/gemini-2.5-pro"` is a supported gateway model.

**Verdict:** AI invocation pattern is canonical for the Lovable managed environment. This is not the source of the 401.

---

## 4. Summary Table

| Layer | Status | Source of 401? |
|---|---|---|
| CORS preflight (OPTIONS) | ✅ Intercepted at top of `serve` | No |
| Supabase API gateway JWT verification | Bypassed (`verify_jwt` defaults to `false` for Lovable functions; no override in `config.toml`) | No |
| Function-level `auth.getUser()` gate (line 76) | ❌ Returned 401 in pre-N-2 trace | **YES** — body `{"error":"unauthorized"}` matches this branch byte-for-byte |
| Lovable AI Gateway / `LOVABLE_API_KEY` | ✅ Correct, guarded, structured errors | No |

---

## 5. Mechanism of the 401 (Definitive)

```
Browser → [CORS OPTIONS] → 200 OK ✅
Browser → [POST + (no/invalid Bearer)] → Gateway accepts (verify_jwt=false) →
         Function executes → auth.getUser() with empty/invalid Authorization →
         returns 401 {"error":"unauthorized"}
```

The 401 is **strictly client-side**: the bearer token was not on the wire (or referenced an expired session). Phase N-2's explicit `headers.Authorization: Bearer ${session.access_token}` injection addresses the on-the-wire half. The remaining failure mode is "no live session at all" — which the hook now surfaces via the explicit Arabic error: `يجب تسجيل الدخول بصلاحية صحيحة لاستخدام حكيم`.

---

## 6. Recommendations (do NOT execute — read-only phase)

1. **Verify the Emperor is signed in** at `/admin/assets/genesis` and that `supabase.auth.getSession()` returns a non-null `access_token`. If null → user must (re)login.
2. **Add `Access-Control-Allow-Methods: "POST, OPTIONS"`** to `corsHeaders` for hardening (cosmetic).
3. **Optional defensive logging** at the function's auth gate to log `userErr?.message` server-side so future failures distinguish "no token" vs "expired token" vs "wrong project ref" without further audits.
4. No change needed to `config.toml`, `LOVABLE_API_KEY`, or the AI invocation path — they are healthy.

---

**Audit complete. Awaiting surgical orders.**
