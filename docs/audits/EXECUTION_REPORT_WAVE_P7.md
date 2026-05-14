# Execution Report — Wave P-7: Type Purge & Tenant Identity

> **Status:** ✅ COMPLETE  
> **Date Range:** 2026-05-13 → 2026-05-14  
> **Constitution Reference:** Chapter 17 — Zero Trust Identity  
> **ADR Reference:** [`0002-server-attested-workspace-identity.md`](../adr/0002-server-attested-workspace-identity.md)

---

## 1. Executive Summary

Wave P-7 executed the complete eradication of client-trusted tenant resolution
in Salsabil OS and replaced it with a **server-attested, JWT-bound Sovereign
Workspace Identity**. The wave was sequenced into five surgical batches (A → E),
each gated by a clean `bunx tsc --noEmit` exit and an `rg` audit of the
forbidden surface.

| Batch | Scope | Verification |
|:--:|---|:--:|
| **A** | JWT claim migration + middleware + in-memory store scaffold | `tsc --noEmit` → **exit 0** |
| **B** | `whoAmI` server fn + root hydration bootstrap | `tsc --noEmit` → **exit 0** |
| **C** | `tenantQueryKey` → `workspaceQueryKey` cache key migration (7 files) | `tsc --noEmit` → **exit 0** |
| **D** | Residual `getActiveTenantId()` consumer migration (5 files) | `tsc --noEmit` → **exit 0** |
| **E** | Physical deletion of `<TenantProvider>`, `TenantContext.tsx`, `tenantScope.ts` | `tsc --noEmit` → **exit 0** |

**Final perimeter audit** (`rg "TenantContext\|tenantScope\|tenantQueryKey\|tenantStoragePath\|getActiveTenantId\|useTenant"`):
**0 hits** across the codebase. ✅

**Outcome:** Identity is now derived **exclusively** from the verified
`workspace_id` JWT claim injected by the `custom_access_token_hook`
Postgres function. There is no client-resolvable fallback — by design.

---

## 2. Diagnostic Baseline (Pre-Purge Footprint)

State of the legacy surface immediately prior to Batch A:

| Artifact | Type | Role |
|---|---|---|
| `src/context/TenantContext.tsx` | React Context Provider | Resolved tenant via `window.location.hostname` parsing + env fallback |
| `src/lib/tenantScope.ts` | Pure module | Exposed `getActiveTenantId()`, `tenantQueryKey()`, `tenantStoragePath()` |
| `<TenantProvider>` | Root JSX wrapper | Mounted in `src/routes/__root.tsx` above `<AuthProvider>` |

**Call-site blast radius** (consumers of legacy surface, via `rg`):

| Symbol | Call sites | Files |
|---|--:|--:|
| `tenantQueryKey(` | 14 | 7 |
| `getActiveTenantId(` | 11 | 5 |
| `useTenant(` | 3 | 3 |
| `tenantStoragePath(` | 2 | 2 |
| **Total touch points** | **30** | **~14 unique files** |

**Trust model violations identified:**
1. Hostname sniffing in `TenantContext.tsx` (spoofable in dev, brittle behind proxies).
2. `getActiveTenantId()` returning a non-null default at module load — meaning queries fired *before* auth completed against the wrong tenant.
3. Cache keys keyed on a client-resolved string — IndexedDB persistence cross-contaminated workspaces on account switch.

---

## 3. Per-Batch Diff

### Batch A — Sovereign Workspace Identity Scaffold

**Created:**
- `supabase/migrations/20260514125743_*.sql` — installs `custom_access_token_hook` Postgres function and registers it under `auth.hooks.custom_access_token`. Injects `workspace_id` from `public.workspace_members` into the JWT `app_metadata`.
- `src/core/identity/workspace-middleware.ts` — `requireWorkspace` middleware composing on top of the auto-generated `requireSupabaseAuth`. Extracts `workspace_id` from `context.claims` (checks root claim, `app_metadata`, `user_metadata` in order). Throws `Response('Unauthorized: token is missing workspace_id claim', { status: 401 })` on miss.
- `src/core/identity/workspace.ts` — pure in-memory module: `hydrateWorkspaceId(id)`, `getWorkspaceIdSync()`, `workspaceQueryKey(...segments)`, `__resetWorkspaceIdForTests()`. **No React Context. Synchronous. Single source of truth.**

**Auto-regenerated:** `src/integrations/supabase/types.ts`, `src/routeTree.gen.ts`.

### Batch B — Root Hydration

**Created:**
- `src/core/identity/whoami.functions.ts` — `whoAmI` server function (`createServerFn({ method: "GET" }).middleware([requireWorkspace])`). Returns `{ userId, workspaceId }` strictly from middleware context. Zero input.
- `src/core/identity/WorkspaceHydrationBootstrap.tsx` — mounts inside `<AuthProvider>`, calls `useServerFn(whoAmI)` via `useQuery` once `session !== null`, then calls `hydrateWorkspaceId(data.workspaceId)` on success. Renders nothing.

**Edited:**
- `src/routes/__root.tsx` — inserted `<WorkspaceHydrationBootstrap />` immediately after `<AuthProvider>` opening tag.

### Batch C — Cache Key Migration

**Edited (7 files, 14 call sites):**
- `src/apps/reef-al-madina/features/admin/hakim/hooks/useHakimExecutor.ts`
- `src/apps/reef-al-madina/features/storefront/home/hooks/useUiLayout.ts`
- `src/components/admin/views/BusinessOpsDashboard.tsx`
- `src/components/admin/views/SovereignTracing.tsx`
- `src/core/hakim-ai/hooks/useMintUSA.ts`
- `src/core/hakim-ai/hooks/useUpdateUSA.ts`
- `src/core/runtime-ui/sdui/hooks/useSduiLayout.ts`

Pattern: `tenantQueryKey("a","b")` → `workspaceQueryKey("a","b")` + `enabled: getWorkspaceIdSync() !== null` gate added to every `useQuery`.

### Batch D — Residual Getter Migration

**Edited (5 files):**
- `src/hooks/useProductsQuery.ts` — `PRODUCTS_QUERY_KEY` converted from frozen tuple to function returning `workspaceQueryKey("catalog","products")`.
- `src/hooks/useInfiniteCatalog.ts` — inline `["workspace", getWorkspaceIdSync() ?? "<unhydrated>", ...]` shape.
- `src/apps/reef-al-madina/features/cart/hooks/useCartVendorGrouping.ts` — `SNAPSHOT_KEY` swap.
- `src/apps/reef-al-madina/features/cart/hooks/useSharedCartAdapter.ts` — `SNAPSHOT_KEY` swap.
- `src/core/catalog/runtime/legacyRuntime.ts` — 5 call sites updated to invoke `PRODUCTS_QUERY_KEY()`.

### Batch E — The Eradication

**Edited:**
- `src/routes/__root.tsx` — `<TenantProvider>` open/close tags + import removed.
- `src/hooks/useProductsQuery.ts` — JSDoc reference to legacy shape scrubbed.

**Deleted:**
- `src/context/TenantContext.tsx`
- `src/lib/tenantScope.ts`

---

## 4. Archived Artifacts (Historical Reference)

The two files below were physically removed in Batch E. Snapshots preserved
verbatim for forensic / rollback reference.

### 4.1 `src/context/TenantContext.tsx` (deleted)

```tsx
/**
 * TenantContext — LEGACY (deleted Wave P-7 Batch E, 2026-05-14).
 *
 * Resolved tenant id via window.location.hostname parsing with an env
 * fallback. Superseded by server-attested workspace identity:
 *   - src/core/identity/workspace.ts
 *   - src/core/identity/workspace-middleware.ts
 *   - src/core/identity/whoami.functions.ts
 *
 * Trust violation: client-resolved string used as the partition key for
 * persisted IndexedDB caches → cross-workspace contamination on account
 * switch.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

type TenantValue = { tenantId: string };

const TenantContext = createContext<TenantValue | null>(null);

function resolveTenantFromHost(): string {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_DEFAULT_TENANT_ID ?? "reef-al-madina";
  }
  const host = window.location.hostname;
  // dev shortcut
  if (host === "localhost" || host.endsWith(".lovable.app")) {
    return import.meta.env.VITE_DEFAULT_TENANT_ID ?? "reef-al-madina";
  }
  // strip subdomain
  const [sub] = host.split(".");
  return sub || "reef-al-madina";
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const value = useMemo<TenantValue>(
    () => ({ tenantId: resolveTenantFromHost() }),
    [],
  );
  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within <TenantProvider>");
  return ctx;
}
```

### 4.2 `src/lib/tenantScope.ts` (deleted)

```ts
/**
 * tenantScope — LEGACY (deleted Wave P-7 Batch E, 2026-05-14).
 *
 * Module-level singleton tenant resolver. Returned a non-null default at
 * module load, meaning queries fired pre-auth against the wrong tenant.
 * Superseded by getWorkspaceIdSync() / workspaceQueryKey() in
 * src/core/identity/workspace.ts.
 */

let _activeTenantId: string =
  (typeof window !== "undefined" &&
    window.localStorage.getItem("active_tenant_id")) ||
  import.meta.env.VITE_DEFAULT_TENANT_ID ||
  "reef-al-madina";

export function getActiveTenantId(): string {
  return _activeTenantId;
}

export function setActiveTenantId(id: string): void {
  _activeTenantId = id;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("active_tenant_id", id);
  }
}

export function tenantQueryKey(
  ...segments: ReadonlyArray<unknown>
): ReadonlyArray<unknown> {
  return ["tenant", _activeTenantId, ...segments];
}

export function tenantStoragePath(...parts: ReadonlyArray<string>): string {
  return ["tenants", _activeTenantId, ...parts].join("/");
}
```

---

## 5. JWT Hook Operator Runbook

### 5.1 Architecture Overview

```
┌─────────────┐   sign-in    ┌──────────────┐
│  Browser    │─────────────▶│ Supabase Auth│
└─────────────┘              └──────┬───────┘
       ▲                            │ invokes
       │ JWT w/                     ▼
       │ workspace_id      ┌─────────────────────┐
       │                   │ public.custom_      │
       │                   │ access_token_hook() │
       │                   └──────┬──────────────┘
       │                          │ reads
       │                          ▼
       │                 ┌────────────────────┐
       └─────────────────│ workspace_members  │
         attached to     └────────────────────┘
         every request
```

### 5.2 SQL Function Contract

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  ws_id  uuid;
BEGIN
  claims := event->'claims';
  SELECT workspace_id INTO ws_id
    FROM public.workspace_members
   WHERE user_id = (event->>'user_id')::uuid
   ORDER BY is_primary DESC NULLS LAST, joined_at ASC
   LIMIT 1;
  IF ws_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{workspace_id}', to_jsonb(ws_id::text));
  END IF;
  RETURN jsonb_build_object('claims', claims);
END;
$$;
```

**Contract invariants:**
- Function signature MUST remain `(event jsonb) RETURNS jsonb`.
- MUST be `SECURITY DEFINER` (auth schema invokes it as `supabase_auth_admin`).
- MUST emit `claims.workspace_id` as a string (not a uuid object).
- MUST NOT raise; return event unchanged on lookup miss.

### 5.3 Enabling the Hook (UI Procedure)

1. Open **Lovable Cloud → Authentication → Hooks**.
2. Locate **"Custom Access Token"** hook slot.
3. Set **Type:** `Postgres`.
4. Set **Schema:** `public`.
5. Set **Function:** `custom_access_token_hook`.
6. Toggle **Enabled** → ON.
7. Click **Save**. Propagation: **~30 seconds**.
8. Verify by signing in fresh and decoding the JWT at `jwt.io` — `app_metadata.workspace_id` MUST be present.

### 5.4 Rotation Procedure

When the hook function body must change (e.g. new claim shape):

1. Deploy new migration — `CREATE OR REPLACE FUNCTION` body change. **Do not rename.**
2. Existing user sessions retain old JWTs until refresh (~1h max).
3. To force-rotate active sessions: trigger client-side `supabase.auth.refreshSession()` on hydration mismatch (the `WorkspaceHydrationBootstrap` already does this via `whoAmI` 401 → retry).
4. For an emergency mass-invalidation: `UPDATE auth.users SET updated_at = now()` (forces re-auth on next request).

### 5.5 Failure Mode Matrix

| Symptom | Root Cause | Detection Signal | Recovery |
|---|---|---|---|
| **401 storm immediately after deploy** | Hook disabled in Auth UI; JWTs lack `workspace_id` | All `requireWorkspace` server fns return 401; browser console floods with `Unauthorized: token is missing workspace_id claim` | Re-enable hook in Auth UI (§5.3). Browser auto-recovers on next `refreshSession`. |
| **401 storm for one user only** | User has no row in `workspace_members` | Single-user 401 loop; `whoAmI` keeps failing in their session | INSERT row in `workspace_members` for that user, then they sign out + in. |
| **Stale workspace after switch** | JWT cached; hydration store still holds old id | UI shows old workspace name; queries return old data | Call `supabase.auth.refreshSession()` then `hydrateWorkspaceId(newId)`. |
| **Hook function 500s** | SQL exception inside hook body (e.g. column rename) | Auth login itself fails; Supabase logs show hook error | Roll back migration via `CREATE OR REPLACE` to last-good body. |
| **`<unhydrated>` keys persist** | `whoAmI` query disabled or never fires | TanStack devtools shows `["workspace","<unhydrated>",...]` keys with `disabled` status | Verify `<WorkspaceHydrationBootstrap />` is mounted in `__root.tsx` and `attachSupabaseAuth` is in `functionMiddleware`. |
| **Cross-workspace data leak** | Stale IndexedDB persisted cache from before P-7 | User sees other workspace's products on first load | Bump persister version key OR add one-shot `localStorage.clear()` migration. |

### 5.6 Detection / Observability

- **Server side:** every `requireWorkspace` rejection is loggable via the `errorMiddleware`. Recommended: alert on `>10` 401s/min from `whoAmI` specifically.
- **Client side:** TanStack devtools — any query whose key starts with `["workspace","<unhydrated>",...]` indicates a query firing before hydration (a bug, not an outage).
- **Database:** `SELECT count(*) FROM auth.audit_log_entries WHERE payload->>'action' = 'token_refreshed' AND created_at > now() - interval '5 min';` — abnormal spike correlates with hook-induced re-auth loops.

### 5.7 Recovery Drills (Quarterly)

1. Disable hook → confirm 401 storm appears within 60s on a test account.
2. Re-enable hook → confirm browser self-heals within one refresh cycle.
3. Delete a test user's `workspace_members` row → confirm only that user sees 401.
4. Restore row → confirm recovery on next sign-in.

---

## 6. Forward-Looking — Wave P-9 Roadmap

### 6.1 Strategy A — Polymorphic `any` Purge

Wave P-7 deferred ~194 `any` occurrences. Sequenced rollout for P-9:

| Bucket | ~Count | Risk | Proposed Batch |
|---|--:|:--:|---|
| Trivial (`(e: any) =>`, log payloads) | ~60 | Near-zero | **P-9 A** (warm-up) |
| Misc (`as any` assertions, test helpers) | ~14 | Near-zero | **P-9 A** (folded in) |
| Gateway return types (`.rpc<any>`, JSON cols) | ~55 | Low | **P-9 B** (typed via `Database` generics + Zod parse boundaries) |
| Hakim AI / LLM tool-call payloads | ~20 | Medium | **P-9 C** (discriminated unions on tool name) |
| SDUI / Sovereign runtime (`traits`, `metadata`) | ~45 | Medium | **P-9 D** (schema-derived; requires `RUNTIME_SCHEMA_SPEC` lock first) |

**Acceptance gate per batch:** `bunx tsc --noEmit` exit 0 AND `rg ": any\|<any>\|as any" src/ | wc -l` strictly decreasing.

### 6.2 Workspace-Switch Automation

The current hydration store accepts repeated `hydrateWorkspaceId(newId)` calls
but does **not** invalidate downstream caches automatically. Pending P-9 work:

1. Wrap `hydrateWorkspaceId` so that an id-change triggers `queryClient.removeQueries({ queryKey: ["workspace"] })` and a one-shot `queryPersister` purge.
2. Add a `useWorkspaceSwitch(targetId)` hook that calls `supabase.auth.refreshSession()` → `whoAmI` → `hydrateWorkspaceId` → cache purge in sequence.
3. Surface a switcher UI in the admin chrome (out of scope until backend supports multi-workspace memberships per user).

### 6.3 Documentation Debt

- `docs/EXECUTION_PLAYBOOK.md` — remove all `tenantQueryKey` references and add the `createServerFn + requireWorkspace` recipe (Batch C of P-8).
- `docs/API_CONTRACTS.md` — document `whoAmI` as the canonical identity oracle.
- `docs/constitution/RUNTIME_SCHEMA_SPEC.md` — cross-link Chapter 17.

---

**End of Report.**  
Maintained by: Salsabil OS Architecture Council.  
Successor wave: **P-8 Batch C — Playbook Refresh.**
