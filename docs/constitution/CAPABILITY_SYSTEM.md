# REEFOS — Capability System

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Authorization in REEFOS is **capability-based**, not role-based.

---

## 1. Definitions

- **Capability** — an atomic, named, dot-separated permission key, e.g. `reef.pos.refund`, `catalog.product.write`, `finance.wallet.payout`.
- **Role** — a *bundle* of capabilities granted to a workspace member. Roles have no behavior of their own.
- **Workspace** — the tenant scope in which capabilities are evaluated.
- **Capability Set** — the resolved set of capability keys granted to the active actor in the active workspace at this moment.

---

## 2. Capability Registry

- All capability keys MUST be declared in `src/core/capabilities/CapabilityRegistry.ts`.
- Each key has a descriptor: `{ key, title, description, domain, sensitivity }`.
- Unknown keys passed to guards MUST fail closed and emit an observability event.

```ts
CAP.REEF_POS_REFUND      // ok — declared
"reef.pos.refund"        // ok if declared
"reef.pos.magic"         // ❌ unknown — guard denies + traces
```

## 3. Resolution Pipeline

```text
session ──▶ workspace_membership ──▶ role bundles ──▶ capability set
                                                     │
                                          overrides (per-user grants/denies)
                                                     ▼
                                               final capability set (immutable)
```

- Resolution happens **server-side**. Frontend receives the resolved set; it does not compute it.
- The resolved set is cached per `(user_id, workspace_id)` and invalidated by membership/role events.
- Admins MAY have an implicit super-set (`useSovereignOverride`) — but it MUST still flow through the resolver and MUST be auditable.

## 4. Usage Rules

- ✅ `useCapability("reef.pos.refund")` for conditional logic.
- ✅ `<CapabilityGuard cap="reef.pos.refund">…</CapabilityGuard>` for UI.
- ✅ Server functions MUST re-check capability via middleware (`requireCapability("...")`). **Frontend checks are UX, not security.**
- ❌ `if (user.role === "admin")` anywhere in the codebase.
- ❌ Inline string lists of allowed roles in components.
- ❌ Persisting capability decisions in client storage.

## 5. Sensitivity Levels

| Level | Examples | Extra requirement |
|---|---|---|
| `public` | view storefront | none |
| `member` | place order | authenticated session |
| `operator` | manage catalog | workspace membership |
| `financial` | refunds, payouts | step-up auth + audit event |
| `sovereign` | admin overrides, kernel ops | sovereign override + immutable audit |

Financial and sovereign capabilities MUST emit events to `admin_override_logs` or `audit_events` on every use.

## 6. Forbidden Patterns

- ❌ Hardcoded role checks
- ❌ Capability strings constructed dynamically from user input
- ❌ Granting capabilities from the client
- ❌ Bypassing guards "temporarily"
- ❌ Using capability checks as a substitute for RLS — both are required

## 7. Lifecycle of a New Capability

1. Declare in `CapabilityRegistry`.
2. Add to the appropriate role bundle migration.
3. Apply on server (middleware) and client (guard) in the same patch.
4. Add audit emission if sensitivity ≥ `financial`.
5. Document in the domain's README.

---

*Roles change with org charts. Capabilities encode intent. Encode intent.*
