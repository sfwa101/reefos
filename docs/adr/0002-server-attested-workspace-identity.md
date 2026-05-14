# ADR-0002: Server-Attested Workspace Identity

| Field | Value |
|---|---|
| **Status** | `Accepted` |
| **Date** | 2026-05-14 |
| **Authors** | Salsabil OS Sovereign Architecture Council |
| **Phase** | Wave P-7 (Type Purge & Tenant Identity) |
| **Tags** | `security` · `identity` · `architecture` · `zero-trust` |

---

## 1. Context

Prior to Wave P-7, Salsabil OS resolved tenant identity entirely on the client:

- `src/context/TenantContext.tsx` exposed `<TenantProvider>` and a React Context whose value was computed from `window.location.hostname`, `import.meta.env.VITE_*` build-time variables, and a `getActiveTenantId()` global accessor.
- `src/lib/tenantScope.ts` exported `tenantQueryKey(...)`, `tenantStoragePath(...)` and similar helpers that prefixed TanStack Query cache keys and storage paths with that **client-asserted** identifier.
- 11+ hooks, 2 admin views, the cart subsystem, and the catalog runtime relied on these helpers to scope per-tenant data.

This violates Constitution **Chapter 17 (Zero Trust)** in three concrete ways:

1. **Client tampering.** Any user can patch `window.location` (proxy, devtools, custom DNS) or rewrite localStorage and assume a different tenant identifier in the cache layer. Although Postgres RLS still blocked unauthorized rows, cache poisoning, cross-tenant query-key collisions, and UX-level data bleed remained possible.
2. **Build-time coupling.** `import.meta.env` is frozen at bundle time. Multi-tenant deployments from a single bundle were impossible without per-tenant rebuilds.
3. **Hostname coupling.** Preview URLs, custom domains, and lovable.app subdomains all required bespoke parsing logic that drifted between code paths.

The existing `requireSupabaseAuth` server middleware already produced an authenticated `claims` object on every server function call — but no part of the system **read a workspace claim from it**. The trust root was in the wrong tier.

---

## 2. Decision

We **enshrine workspace identity as a server-attested JWT claim** and eradicate every client-side resolution path. Concretely:

1. **Postgres `custom_access_token_hook`.** A SECURITY DEFINER function reads `workspace_members` for the authenticated `auth.uid()` and injects `workspace_id` into the issued access token. Configured via Supabase Auth Hooks. Migration: `supabase/migrations/20260514125743_*.sql`.

2. **`requireWorkspace` middleware** (`src/core/identity/workspace-middleware.ts`). Composes on top of `requireSupabaseAuth`, extracts `workspace_id` from `context.claims` (with fallbacks to `app_metadata.workspace_id` and `user_metadata.workspace_id`), and rejects requests missing the claim with **HTTP 401**. There is no client fallback by design.

3. **`whoAmI` sovereign oracle** (`src/core/identity/whoami.functions.ts`). The single server function that exposes `{ userId, workspaceId }` derived purely from the verified token.

4. **Synchronous in-memory store** (`src/core/identity/workspace.ts`). Pure module-level cache — **no React Context, no hostname sniffing, no env reads**. Three exports:
   - `hydrateWorkspaceId(id)` — called exactly once by the root bootstrap after `whoAmI` resolves.
   - `getWorkspaceIdSync()` — returns `string | null`. `null` MUST be treated as "not yet authenticated", never as a default tenant.
   - `workspaceQueryKey(...segments)` — partitions TanStack Query cache by workspace.

5. **Root hydration** (`src/core/identity/WorkspaceHydrationBootstrap.tsx`). Headless component mounted under `<AuthProvider>` in `__root.tsx`. Calls `whoAmI` whenever the authenticated user changes and writes the result into the in-memory store.

6. **Eradication.** `src/context/TenantContext.tsx`, `src/lib/tenantScope.ts`, and the `<TenantProvider>` mount are **deleted**. All `tenantQueryKey` / `getActiveTenantId` call sites are migrated to `workspaceQueryKey` / `getWorkspaceIdSync`.

---

## 3. Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Keep `TenantContext`, harden it with a server check | Trust root remains on client; cache key tampering still possible; doesn't unlock single-bundle multi-tenancy. |
| Pass `workspace_id` as an explicit argument to every server function | Trivially spoofable; every handler would need redundant validation against the JWT subject's actual membership; massive surface for drift. |
| Resolve workspace via a per-request server fetch (no JWT claim) | Adds a database round-trip to every server function; doubles cold-start latency; defeats the purpose of having signed claims. |
| Use Supabase `app_metadata` set at signup only | Cannot represent workspace switching; stale after membership changes; not refreshed without a forced re-login. |

---

## 4. Consequences

### 4.1 Positive
- ✅ **Constitutional compliance.** Chapter 17 (Zero Trust) is now enforced at the type level: there is no client-side getter for tenant identity that could be tampered with.
- ✅ **Single-bundle multi-tenancy.** The same JS bundle serves any workspace; the JWT decides scope.
- ✅ **Cache integrity.** TanStack Query cache keys are prefixed with the server-attested id; cross-workspace contamination is impossible by construction.
- ✅ **Smaller surface.** `TenantContext.tsx` (≈140 LOC) and `tenantScope.ts` (≈60 LOC) deleted. `getActiveTenantId` references: **zero** outside the deleted files.
- ✅ **Observability.** Every server function call carries a verified `workspaceId` in middleware context — usable for tracing, audit logs, and rate limits.

### 4.2 Trade-offs
- ⚠️ **Hydration latency.** Queries gated on `getWorkspaceIdSync() !== null` defer their first fetch by one round-trip to `whoAmI`. Mitigated by parallel issue from the root bootstrap and TanStack's `enabled` flag.
- ⚠️ **JWT hook is mandatory.** A misconfigured Supabase Auth Hook leaves every authenticated user effectively logged out from server functions (401). See operator runbook in Wave P-8 Batch B.
- ⚠️ **No `useWorkspace()` React hook.** Synchronous reads only. Components that previously expected reactive updates on tenant change must subscribe to auth state and re-read.

### 4.3 Risks
- 🔴 If the `custom_access_token_hook` is disabled in Cloud → Auth Settings, **all** authenticated server functions return 401. Detection: `WorkspaceHydrationBootstrap` logs `[WorkspaceHydration] whoAmI failed` once per session.
- 🔴 Workspace switching requires a token refresh (`supabase.auth.refreshSession()`) followed by re-invoking `whoAmI`. Not yet automated — flagged for a future ADR.

---

## 5. Implementation Plan (executed in Wave P-7)

- [x] Batch A — Scaffold `workspace-middleware.ts`, `workspace.ts`, JWT hook migration.
- [x] Batch B — `whoAmI` server fn + `WorkspaceHydrationBootstrap` mounted in `__root.tsx`.
- [x] Batch C — Migrate 7 consumer files from `tenantQueryKey` → `workspaceQueryKey`.
- [x] Batch D — Migrate residual `getActiveTenantId()` call sites to `getWorkspaceIdSync()`.
- [x] Batch E — Delete `TenantContext.tsx`, `tenantScope.ts`, `<TenantProvider>` mount.

---

## 6. Acceptance Criteria

- [x] `bunx tsc --noEmit` exits 0.
- [x] `rg "TenantContext|tenantScope|tenantQueryKey|tenantStoragePath|getActiveTenantId|useTenant"` returns 0 hits.
- [x] No file outside `src/core/<domain>/gateway/**` and server functions imports the Supabase client.
- [x] No source file reads `window.location` or `import.meta.env.VITE_*` for identity resolution.
- [x] `docs/constitution/ZERO_TRUST_IDENTITY.md` codifies the new doctrine.

---

## 7. Links

- Constitution: `docs/constitution/ZERO_TRUST_IDENTITY.md` (Chapter 17)
- Constitution: `docs/constitution/SUPABASE_SOVEREIGNTY.md`
- Migration: `supabase/migrations/20260514125743_825bb01b-e7f1-4e30-a2b3-e78609b280d2.sql`
- Server middleware: `src/core/identity/workspace-middleware.ts`
- In-memory store: `src/core/identity/workspace.ts`
- Sovereign oracle: `src/core/identity/whoami.functions.ts`
- Bootstrap: `src/core/identity/WorkspaceHydrationBootstrap.tsx`

---

## 8. Reviewer Notes

Future contributors: **never** reintroduce a client-side workspace getter. If you need workspace identity in a server function, add `.middleware([requireWorkspace])` and read `context.workspaceId`. If you need it in a component, call `getWorkspaceIdSync()` and gate on `!== null`. If you find yourself reaching for `window.location` or `import.meta.env` to learn *who the user is*, you are violating Chapter 17 — stop and revisit this ADR.
