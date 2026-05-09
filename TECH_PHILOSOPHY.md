# ⚙️ TECH_PHILOSOPHY.md — Salsabil OS Engineering Laws

> Companion to [`VISION.md`](./VISION.md).
> Where VISION declares **what we are building**, this document declares
> **how we are allowed to build it**. These laws are non-negotiable.
> Violating any of them is not a style preference — it is a structural
> defect that must be reverted.

---

## Prime Directive

> **Constraints are features.**
> Every law below exists because its absence has, somewhere in software
> history, killed a great product. We accept the friction gladly.

---

## ⚖️ Law 1 — Capability Composer over Page Builder

We do **not** build rigid visual pages. We build **Smart Living Blocks**
(*Capabilities*) that the runtime **composes** based on declarative
**intents**.

### Mandatory pattern

```ts
// ❌ FORBIDDEN — hand-wired page
function CashierScreen() {
  return (
    <div className="grid grid-cols-3 gap-4 p-6 bg-white">
      <OrdersList />
      <PaymentsPanel />
      <InventoryLookup />
    </div>
  );
}

// ✅ REQUIRED — declarative intent for the Composer
const cashierIntent: SDUIIntent = {
  intent: "scope.cashier.session",
  capabilities: [
    "orders.queue",
    "payments.collect",
    "inventory.lookup",
  ],
  scope: { tenant: tenantId, branch: branchId },
  density: "auto",   // resolved from Interface DNA
};
```

### Rules
- Every editor/SDUI surface emits **typed intents**, never pixels or HTML.
- Hex colors, raw `px`, inline `style={}` are forbidden in blocks.
- All visual decisions resolve from **Design Tokens** (`var(--*)`).
- Unknown intents must **fail closed**, never render raw payloads.
- Pages under `src/pages/*` and `src/routes/*` are **thin shells** over
  the Composer — they hold no business UI logic of their own.

> Pixels are the **output** of a function, never an **input** to it.

---

## ⚖️ Law 2 — Stem Cell Architecture

We do **not** ship redundant apps, redundant pages, or per-role file
quartets. **One unified codebase** where `tenant_id` and **Role DNA**
dictate the UI and data projections at runtime.

### Mandatory pattern
- One capability module per business domain (`features/orders/`,
  `features/inventory/`).
- Role/scale/context differences expressed through **props, slots, and
  Composer decisions** — never through `CashierOrders.tsx` /
  `DriverOrders.tsx` / `VendorOrders.tsx` / `AdminOrders.tsx`.
- Modules remain isolated stem cells (Manifesto §1.1): no
  cross-module imports. Sharing happens through `core-os/`, `context/`,
  `lib/` — never through `modules/A → modules/B`.
- Every query, every storage path, every realtime channel is scoped via
  `tenantQueryKey()` / `tenantStoragePath()`. **Multi-tenancy is
  structural, not policy.**

> The system grows by **differentiation**, not by **duplication**.

---

## ⚖️ Law 3 — Hyper-Speed Local-First

**The network is an illusion.** Every operator action must succeed
*instantly* on the device, then reconcile with the server in the
background. If a button waits for the network, it is a bug.

### Mandatory mechanics
- **IndexedDB persistence** for the TanStack Query cache
  (`lib/queryPersister.ts`), partitioned per tenant.
- **Stale-While-Revalidate** as the default fetching strategy —
  `staleTime` set deliberately on every query.
- **Background Sync Queue** (Phase 49 — `lib/offlineSyncQueue.ts` +
  `useBackgroundSyncManager`) absorbs every sensitive mutation when the
  network drops, drains on `online` and `visibilitychange`.
- **Optimistic UI by default** — every mutation patches the cache
  before the round-trip; rollback on failure.
- **Idempotency keys on every write** — replays must be safe.
- **Visibility-aware sockets** (`useVisibilitySocket`) — disconnect on
  hidden tabs to save battery and server resources.
- **Incremental hydration** — route islands hydrate on visibility, not
  on page load.

> Latency budget: **0 ms perceived** for any operator action.

---

## ⚖️ Law 4 — Autonomous Governance

**Human intervention is a failure mode.** The system must defend itself
against bad inputs, AI hallucinations, and partial outages — without a
human in the loop.

### Mandatory mechanics
- **Strict Zod schemas** on every server-function input, every SDUI
  intent, every webhook payload, every AI response. No `any`, no
  silent coercion. Validation failures **fail closed**.
- **SDUI Error Boundaries** wrap every block. A crashing block
  collapses to a graceful skeleton, never blanks the screen, and
  reports itself via `sovereignTracing.ts`.
- **AI Sandboxing** — Hakim outputs pass through Zod gates, profit
  guardrails (`LossPreventionRule`), and rate limiters before any
  side-effect. AI never writes directly to a sensitive table.
- **Automated Circuit Breakers** — repeated failures (network, RPC, AI)
  trip a breaker that returns the cached/last-known-good state and
  enqueues a retry. No silent infinite loops.
- **Health probes & self-healing** — sockets reconnect with backoff,
  service workers self-unregister when stale, queues self-drain.

> The system is **antifragile by construction**, not by oncall.

---

## ⚖️ Law 5 — The Immutable Ledger

**No state change escapes the ledger.** Every mutation, every payment,
every AI override, every admin action is logged to the **sovereign
tracing timeline** in an append-only fashion.

### Mandatory mechanics
- **All sensitive writes through `SECURITY DEFINER` RPCs** — never
  raw `supabase.from(table).update()` from the client for orders,
  wallets, inventory adjustments, role grants, or pricing overrides.
- **`admin_override_logs`** (and equivalents) are **INSERT-only** with
  RLS — even admins cannot edit the past.
- **Idempotency keys** on every financial mutation, persisted, indexed,
  and de-duplicated server-side.
- **`sovereignTracing.ts`** captures: actor, role, tenant, intent,
  inputs, outputs, latency, and outcome — for every meaningful action.
- **Roles live in `user_roles` only** — never on `profiles`. Checked
  via `has_role(auth.uid(), …)` from a `SECURITY DEFINER` function.
- **RLS on every table.** No exceptions, no "we'll add it later".

> The ledger is the **single source of historical truth**. If it isn't
> in the ledger, it didn't happen.

---

## 🚫 Anti-Patterns (Instant Rejection)

| Anti-pattern | Why it's banned |
|---|---|
| `any` in TypeScript | Defeats the type system; use `unknown` + guards |
| Hardcoded colors / spacing / `px` | Breaks neuroadaptive themes |
| `pages/<Role><Feature>.tsx` quartets | Violates Law 2 (Stem Cell) |
| Direct `supabase.from().update()` from a page | Violates Law 5 (Ledger) |
| Storing roles on `profiles` | Privilege-escalation vector |
| Synchronous network on user action | Violates Law 3 (Hyper-Speed) |
| Hash-anchor "single-page" navigation | Kills SSR + SEO |
| Editing `routeTree.gen.ts` | Auto-generated — never touch |
| Editing `integrations/supabase/client.ts` / `types.ts` | Auto-generated |
| Pricing math in components (`* 0.95`) | Pricing Engine is the only oracle |
| AI output written to DB without Zod gate | Violates Law 4 |

---

## ✅ Definition of Done

A change is **done** when:
1. `tsc --noEmit` passes with **zero** errors and **zero** new `any`.
2. Every new table has RLS; every sensitive write goes through an RPC.
3. Tenant scoping (`tenantQueryKey` / `tenantStoragePath`) is applied.
4. Tokens — not raw colors — drive every visual decision.
5. The mutation path tolerates offline (queue + idempotency).
6. The capability is composable — no role-specific file copies.
7. AI hooks (if any) pass through Zod + guardrails before side-effects.
8. The change is logged in `ARCHITECTURAL_ROADMAP.md` with a phase id.

---

## The Engineer's Oath

> I will not hardcode what can be composed.
> I will not duplicate what can adapt.
> I will not trust what can be verified.
> I will not block what can be queued.
> I will not paint what can be themed.
> I will not write what cannot be traced.
> I will audit before I act.
> I will leave the system stronger than I found it.

— *Principal Enterprise Architect, Salsabil OS*
