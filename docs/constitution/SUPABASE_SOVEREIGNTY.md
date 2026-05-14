# REEFOS — Supabase Sovereignty

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Defines how Supabase (the data plane provider for Lovable Cloud) is contained, abstracted, and governed.

> **Communication note:** Externally we refer to the data plane as **Lovable Cloud**. "Supabase" appears only inside this document and in code-level references.

---

## 1. Doctrine

> **Supabase is an implementation detail. It must never leak into UI, domain logic, or public contracts.**

The data plane can be replaced, sharded, or partially migrated without touching presentation or domain code.

---

## 2. Containment Rules

- ✅ The Supabase client (`src/integrations/supabase/client.ts`, `client.server.ts`) is imported **only** by:
  - Files under `src/core/<domain>/gateway/**`
  - Server functions (`*.functions.ts`, `*.server.ts`)
  - Edge functions (`supabase/functions/**`)
- ❌ Any other file importing the Supabase client is a constitutional violation.
- ❌ React components, pages, routes, hooks consumed by UI, modules' UI subfolders, and apps MUST NOT import the Supabase client.

## 3. Gateway Pattern

Every domain that touches the data plane exposes a gateway:

```text
src/core/<domain>/gateway/
  ├── <domain>Gateway.ts     ← public façade (typed methods)
  ├── <domain>Queries.ts     ← raw queries, internal
  ├── <domain>Cache.ts       ← memoization / TanStack helpers
  └── index.ts               ← barrel
```

Rules:

- Gateway methods accept and return **typed VMs / DTOs**, never raw rows.
- Gateway parses every Supabase response with Zod before returning.
- Gateway centralizes pagination, error mapping, and tracing.
- Gateway is the only place permitted to use `.from()`, `.rpc()`, or `.functions.invoke()`.

## 4. RLS is Mandatory

- Every table MUST have RLS enabled.
- Policies MUST use `has_role(auth.uid(), '...')` or capability-projection helpers.
- Roles live in `user_roles` (separate table). **Never** store roles on `profiles` or `users`.
- Frontend capability checks are UX. RLS is the security boundary. Both required.

## 5. Tenancy Enforcement (Zero Trust)

> See **`ZERO_TRUST_IDENTITY.md`** (Chapter 17) and **ADR-0002** for the full doctrine.

- Workspace identity **MUST** be derived from the authenticated JWT `workspace_id` claim, injected by the Postgres `custom_access_token_hook`. Client-supplied workspace identifiers are **ignored** and **MUST NOT** appear as server-function arguments.
- Server functions touching workspace-scoped data **MUST** compose `requireWorkspace` (from `@/core/identity/workspace-middleware`) and read identity exclusively from `context.workspaceId`. Where workspace scoping is not required, `requireSupabaseAuth` remains the minimum bar.
- Gateways **MUST NOT** trust any tenant identifier originating from the request body, query string, headers (other than `Authorization`), or cookies.
- Cross-tenant queries are forbidden outside explicit sovereign-admin paths, which **MUST** audit-log every access.
- The `custom_access_token_hook` **MUST** remain enabled in Cloud → Auth Settings. Disabling it is a P0 incident — every authenticated server function will return 401.

## 6. Reserved Schemas

The following schemas are **off-limits** for application logic, triggers, or migrations:

- `auth`, `storage`, `realtime`, `supabase_functions`, `vault`

## 7. Migrations

- All schema changes go through the migration tool — no direct SQL in production.
- `ALTER DATABASE postgres ...` is forbidden.
- CHECK constraints with time-dependent predicates are forbidden — use validation triggers.
- Destructive migrations require an ADR.

## 8. Edge & Server Functions

- Edge functions read secrets via `process.env` inside handlers, never at module scope.
- Auth-protected server functions MUST use `requireSupabaseAuth` middleware and MUST NOT be called from public route loaders (see TanStack invariants).
- Public webhook routes live under `src/routes/api/public/` and MUST verify signatures.

## 9. Realtime

- Realtime subscriptions live in gateways/services, not in components.
- A component subscribes via a hook that wraps the gateway subscription and exposes typed events.

## 10. Forbidden Patterns

- ❌ `supabase.from(...)` in any UI or component file.
- ❌ Returning raw Supabase rows from a hook.
- ❌ Embedding Supabase URLs, project refs, or service keys in client bundles.
- ❌ Bypassing RLS by using the service role key in client/edge UI flows.
- ❌ Mentioning "Supabase" or "Supabase dashboard" in user-facing copy.

## 11. Disaster Posture

- Loss of data plane MUST degrade gracefully — gateways return typed `Failure` results; UI renders graceful states; the system never reveals provider internals.
- Backups (`scripts/backup-db.ts`) and restore drills are part of operational discipline, not optional hygiene.

---

*The data plane is sovereign infrastructure, not an SDK. Treat it like a kernel resource: contained, audited, replaceable.*
