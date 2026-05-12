# REEFOS — Domain Boundaries

> Subordinate to `SYSTEM_CONSTITUTION.md` and `ARCHITECTURE_LAWS.md`.
> Defines the **bounded contexts** of REEFOS, their ownership, and the legal channels of communication between them.

---

## 1. Bounded Contexts

| Domain | Purpose | Canonical home |
|---|---|---|
| **catalog** | Products, variants, addons, sections, recommendations | `src/core/catalog/`, `src/modules/<vertical>/` |
| **identity** | Auth, profiles, KYC, workspaces, role bundles | `src/core/identity/`, `src/context/AuthContext.tsx` |
| **capability** | Capability registry, resolution, guards | `src/core/capabilities/` |
| **finance** | Pricing engine, wallet, ledger, payouts, commissions | `src/core/engine/pricing/`, `src/core-os/finance/` |
| **commerce** | Cart, checkout, orders, fulfillment state machine | `src/store/useCartStore.ts`, `src/core/commerce/` (future) |
| **logistics** | Hubs, routing, drivers, ETA, dispatch | `src/core-os/barq-logistics/` |
| **runtime-ui** | SDUI descriptors, blocks, renderer, resolvers | `src/core/runtime-ui/`, `src/core-os/sdui-engine/` |
| **ai** | Hakim advisors, generation gateways, governance | `src/core-os/hakim-ai/`, `supabase/functions/hakim-*` |
| **observability** | Tracing, audit, behavior events | `src/core-os/event-bus/`, `src/lib/sovereignTracing.ts` |
| **tenancy** | Workspaces, multi-tenant scoping | `src/context/TenantContext.tsx`, server membership |

Each domain is a **cell**. Cells have membranes; communication crosses only through approved channels.

---

## 2. Ownership Rules

- A domain owns its **types**, **schemas**, **gateway**, **services**, **hooks**, and **events**.
- A domain MUST expose a single **public barrel** (`index.ts`). External callers import from the barrel only.
- Internal files inside a domain (`./internal/*`, `./runtime/*`, `./gateway/*`) are private.

---

## 3. Legal Channels Between Domains

Only three channels are allowed across a domain membrane:

1. **Gateway facade** — explicit named function with a typed contract (e.g. `catalogGateway.listSection({...})`).
2. **Event bus** — fire-and-forget typed events consumed via subscription (`EVENT_SYSTEM.md`).
3. **Capability check** — `useCapability` / `CapabilityGuard` (read-only).

Forbidden channels:

- ❌ Direct import of another domain's internal files.
- ❌ Shared mutable singletons across domains.
- ❌ Reaching into another domain's Supabase tables directly.
- ❌ Reusing another domain's React Query keys.

---

## 4. Cross-Cutting Concerns

These concerns are **shared infrastructure**, not domains. They live under `src/core/` or `src/lib/` and are dependency-free of any business domain:

- Logging / tracing primitives
- Schema validation utilities (Zod helpers)
- Date / currency formatting
- HTTP / fetch wrappers
- Feature flags

A cross-cutting module that begins to encode business rules has escaped its remit and MUST be extracted into a domain.

---

## 5. Apps Layer

`src/apps/<app-name>/` is **composition only**. An app:

- ✅ Wires routes, layouts, navigation, branding.
- ✅ Selects which domain features to expose.
- ❌ Does NOT contain business logic.
- ❌ Does NOT bypass gateways.
- ❌ Does NOT fork a domain.

If an app needs domain behavior to vary, the variation lives as **capabilities + descriptors**, not as forked code.

---

## 6. Stem-Cell Excisability Test

A domain passes the constitutional test only if **deleting its directory** breaks **only its own routes and capabilities** — never another domain. Reviewers MUST mentally apply this test to every PR that touches a domain boundary.

---

## 7. Diagram

```text
            ┌────────────┐        ┌────────────┐
            │  catalog   │◀──gw──▶│  commerce  │
            └─────┬──────┘        └─────┬──────┘
                  │ events              │ events
                  ▼                     ▼
            ┌────────────────── EVENT BUS ─────────────────┐
                  ▲                     ▲           ▲
                  │ events              │           │
            ┌─────┴──────┐        ┌─────┴──────┐  ┌─┴──────────┐
            │  finance   │        │ logistics  │  │ observ.    │
            └────────────┘        └────────────┘  └────────────┘
```

Identity and capability are orthogonal — every domain consults them, none owns them.

---

*Boundaries are the only thing that lets a system grow without becoming a tar pit.*
