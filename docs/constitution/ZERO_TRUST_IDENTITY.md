# Salsabil OS — Chapter 17: Zero Trust Identity

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Codifies the doctrine ratified by **ADR-0002 (Server-Attested Workspace Identity)** and Wave P-7.

---

## 1. Doctrine

> **Identity is a server-issued claim. The client is a renderer, never an oracle.**

Every assertion about *who the user is* and *which workspace they belong to* MUST originate from a cryptographically verified Supabase JWT. The client tier MUST NOT compute, infer, or default any identity value. Code that does is a constitutional violation and MUST be removed on sight.

---

## 2. Forbidden Patterns (MUST NOT)

- ❌ **MUST NOT** read `window.location.hostname`, `window.location.host`, or any `Location` field to resolve tenant, workspace, or organization identity.
- ❌ **MUST NOT** read `import.meta.env.VITE_*` for identity resolution. Build-time variables are configuration, not identity.
- ❌ **MUST NOT** read `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or `document.referrer` to determine the active workspace.
- ❌ **MUST NOT** parse subdomains, paths, query strings, or hash fragments to assert tenant identity for security decisions.
- ❌ **MUST NOT** accept a `workspaceId`, `tenantId`, or equivalent identifier as a server-function argument from the client. Read it from middleware context instead.
- ❌ **MUST NOT** reintroduce a React Context, Zustand store, or any reactive primitive whose value is the workspace id derived from anything other than `whoAmI`'s response.
- ❌ **MUST NOT** create a getter named `getActiveTenantId`, `getCurrentTenant`, `useTenant`, or any equivalent that returns identity computed on the client.
- ❌ **MUST NOT** prefix cache keys, storage paths, or analytics events with a tenant identifier sourced from anything other than `getWorkspaceIdSync()` or `workspaceQueryKey()`.

---

## 3. Required Patterns (MUST)

### 3.1 Server tier

- ✅ Every server function that touches workspace-scoped data **MUST** compose `requireWorkspace` from `@/core/identity/workspace-middleware`.
- ✅ Server functions **MUST** read workspace identity exclusively from `context.workspaceId`. The `claims` object is the only trust root.
- ✅ The Postgres `custom_access_token_hook` **MUST** remain enabled in Cloud → Auth Settings. Disabling it is a P0 incident.
- ✅ When a JWT lacks the `workspace_id` claim, the middleware **MUST** reject the request with HTTP 401. There is no fallback.

```ts
// REQUIRED shape for any workspace-scoped server function
export const myFunction = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }) => {
    const { workspaceId, userId, supabase } = context;
    // ...
  });
```

### 3.2 Client tier

- ✅ The client **MUST** call `whoAmI` exactly once per authenticated session via `WorkspaceHydrationBootstrap` and write the result into the in-memory store.
- ✅ Components and hooks **MUST** read workspace identity via `getWorkspaceIdSync()` from `@/core/identity/workspace`.
- ✅ TanStack Query consumers **MUST** prefix keys with `workspaceQueryKey(...)` and **MUST** gate `useQuery` on `enabled: getWorkspaceIdSync() !== null`.
- ✅ `null` from `getWorkspaceIdSync()` **MUST** be treated as "not yet authenticated". It **MUST NOT** be coerced to a default workspace, an empty string, or a placeholder used in a security decision.

### 3.3 Workspace switching

- ✅ Switching workspaces **MUST** force a Supabase session refresh (`supabase.auth.refreshSession()`) so the new JWT carries the updated claim, then re-invoke `whoAmI`.
- ✅ The TanStack Query cache **MUST** be invalidated or cleared on workspace switch — partitioning by `workspaceQueryKey` makes stale data inert, but evicting it is good hygiene.

---

## 4. Trust Boundary Diagram

```
  [ Postgres ]
      │   custom_access_token_hook(event)
      │   → injects workspace_id into JWT
      ▼
  [ Supabase Auth ]  ← signs token
      │
      ▼
  [ Browser ]  stores token in localStorage (opaque to app code)
      │
      │   attachSupabaseAuth (functionMiddleware)
      │   sets Authorization: Bearer <token>
      ▼
  [ TanStack Server Function ]
      │   requireSupabaseAuth verifies signature → claims
      │   requireWorkspace extracts workspace_id → context.workspaceId
      ▼
  [ Handler ]  ← single source of truth
```

The dashed line of trust crosses the network exactly **once**, at the JWT signature check. Everything downstream of that line is verified; everything upstream is hostile.

---

## 5. Enforcement

- ESLint / `rg` audits are run as part of the release ritual:

  ```bash
  rg "TenantContext|tenantScope|tenantQueryKey|tenantStoragePath|getActiveTenantId|useTenant" src/
  rg "window\.location\.(hostname|host)" src/ --glob '!**/*.md'
  rg "import\.meta\.env\.VITE_[A-Z_]*TENANT" src/
  ```

  Any non-zero hit outside documentation is a release blocker.

- New server functions touching workspace data without `requireWorkspace` **MUST** be rejected at code review.
- New client code that introduces a workspace getter outside `@/core/identity/workspace` **MUST** be rejected at code review.

---

## 6. Exceptions

There are none. If a use case appears to require client-side identity resolution, the correct response is to:

1. Stop.
2. Open a new ADR explaining why the doctrine is insufficient.
3. Get the ADR ratified before writing code.

The Constitution prevails over framework conveniences, deadline pressure, and personal preference.

---

*Identity is the foundation of every other guarantee. Compromise it once and the entire system becomes a UX layer over a security theater.*
