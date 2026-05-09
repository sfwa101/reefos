# ⚙️ TECH_PHILOSOPHY.md — Salsabil OS Engineering Laws

> Companion to [`VISION.md`](./VISION.md).
> Where VISION declares **what we are building** (a Human OS with morphing
> Workspaces and a Capability Marketplace), this document declares
> **how we are allowed to build it**. These laws are non-negotiable.
> Violating any of them is a structural defect that must be reverted.

---

## Prime Directive

> **Constraints are features.**
> The Human OS only works if every engineer obeys the same six laws.

---

## ⚖️ Law 1 — Capability Composer over Page Builder

We do **not** build rigid visual pages. We build **Smart Living Blocks**
(*Capabilities*) that the runtime **composes** based on declarative
**intents** — both for first-party features and for blocks installed
from the **Capability Marketplace**.

### Mandatory pattern

```ts
// ❌ FORBIDDEN — hand-wired page
function CashierScreen() {
  return (
    <div className="grid grid-cols-3 gap-4 p-6 bg-white">
      <OrdersList />
      <PaymentsPanel />
    </div>
  );
}

// ✅ REQUIRED — declarative intent for the Composer
const cashierIntent: SDUIIntent = {
  intent: "scope.cashier.session",
  capabilities: ["orders.queue", "payments.collect", "inventory.lookup"],
  scope: { workspace: workspaceId },
  density: "auto", // resolved from Professional DNA
};
```

### Rules
- Every surface emits **typed intents**, never pixels or HTML.
- Hex colors, raw `px`, inline `style={}` are forbidden in blocks.
- All visual decisions resolve from **Design Tokens** (`var(--*)`).
- Unknown intents must **fail closed**, never render raw payloads.
- Pages under `src/routes/*` are **thin shells** over the Composer.
- Marketplace capabilities install as Composer registrations — never as
  ad-hoc routes or hand-mounted React trees.

> Pixels are the **output** of a function, never an **input** to it.

---

## ⚖️ Law 2 — Stem Cell Architecture & Multi-Reality

We do **not** ship redundant apps, redundant pages, or per-role file
quartets. **One unified codebase** where `workspace_id` + **Role DNA**
dictate the UI and data projections at runtime — enabling instant
**Workspace Morphing**.

### Mandatory pattern
- One capability module per business domain (`features/orders/`,
  `features/inventory/`).
- Archetype differences (Merchant / Driver / Investor / Teacher) are
  expressed through **Professional DNA + Composer decisions** — never
  through `MerchantOrders.tsx` / `DriverOrders.tsx` quartets.
- Switching Workspaces never reloads the app — DNA changes, Composer
  re-resolves, queries re-key on the new `workspace_id`.
- No cross-module imports between stem cells. Sharing happens through
  `core-os/`, `context/`, `lib/`.
- Every query, storage path, and realtime channel is scoped via
  `workspaceQueryKey()` / `workspaceStoragePath()`. **Multi-reality is
  structural, not policy.**

> The system grows by **differentiation**, not by **duplication**.

---

## ⚖️ Law 3 — Hyper-Speed Local-First (Ground-Sync Engine)

**The network is an illusion.** Every operator action must succeed
*instantly* on the device, then reconcile with the server in the
background. If a button waits for the network, it is a bug.

### Mandatory mechanics
- **IndexedDB persistence** for the TanStack Query cache
  (`lib/queryPersister.ts`), partitioned per workspace.
- **Stale-While-Revalidate** as the default fetching strategy.
- **Offline Sync Queue** (`lib/offlineSyncQueue.ts` +
  `useBackgroundSyncManager`) absorbs every sensitive mutation when the
  network drops, drains on `online` and `visibilitychange`.
- **Optimistic UI by default** — every mutation patches the cache before
  the round-trip; rollback on failure.
- **Idempotency keys on every write.**
- **Visibility-aware sockets** disconnect on hidden tabs.

> Latency budget: **0 ms perceived** for any operator action.

---

## ⚖️ Law 4 — Cognitive UI Adaptation

The UI must reflect the **cognitive load** and **motor context** of the
active Workspace's Professional DNA. The same component renders
differently for an accountant, a driver, a teacher, an investor.

### Mandatory mechanics
- **Driven by Design Tokens only.** No archetype-specific hex codes,
  spacings, or font sizes hard-coded into components. Tokens like
  `--touch-target`, `--density`, `--contrast`, `--motion` resolve from
  the active DNA.
- **Density modes** (`minimal | balanced | dense`) are first-class —
  every data surface must declare which it supports.
- **Touch-target minimums** are enforced per `motorContext`:
  thumb ≥ 56px, glove/outdoor ≥ 64px, mouse ≥ 32px.
- **Contrast & motion** adapt to `ambientLight` and accessibility prefs;
  never assume a "default" environment.
- **No archetype branching in JSX** (`if (role === "driver")`). Branch
  on tokens/DNA, not on identity.

> A driver under the sun and an accountant in the office must both feel
> the app was built only for them — without writing two apps.

---

## ⚖️ Law 5 — Autonomous Governance

**Human intervention is a failure mode.** The system defends itself
against bad inputs, AI hallucinations, and partial outages — without a
human in the loop.

### Mandatory mechanics
- **Strict Zod schemas** on every server-function input, every SDUI
  intent, every webhook payload, every AI response. No `any`, no
  silent coercion. Validation failures **fail closed**.
- **SDUI Error Boundaries** wrap every block. A crashing block collapses
  to a graceful skeleton, never blanks the screen, and reports itself
  via `sovereignTracing.ts`.
- **AI Sandboxing** — Hakim outputs pass through Zod gates, profit
  guardrails, and rate limiters before any side-effect. AI never writes
  directly to a sensitive table.
- **Automated Circuit Breakers** — repeated failures trip a breaker that
  returns the cached/last-known-good state and enqueues a retry.
- **Self-healing** — sockets reconnect with backoff, service workers
  self-unregister when stale, queues self-drain.

> The system is **antifragile by construction**, not by oncall.

---

## ⚖️ Law 6 — Zero-Trust Execution & Immutable Ledger

**No state change escapes the ledger.** Every mutation, every payment,
every AI override, every Workspace morph is logged to the **sovereign
tracing timeline** in an append-only fashion.

### Mandatory mechanics
- **All sensitive writes through `SECURITY DEFINER` RPCs** — never raw
  `supabase.from(table).update()` from the client for orders, wallets,
  inventory, role grants, pricing, or workspace switches.
- **`admin_override_logs`** and equivalents are **INSERT-only** with
  RLS — even admins cannot edit the past.
- **Idempotency keys** on every financial mutation, persisted, indexed,
  de-duplicated server-side.
- **`sovereignTracing.ts`** captures: actor, identity, active workspace,
  intent, inputs, outputs, latency, outcome — for every meaningful
  action, including Workspace morphs and Capability installs.
- **Roles live in `user_roles` only** — never on `profiles`. Checked via
  `has_role(auth.uid(), …)` from a `SECURITY DEFINER` function.
- **RLS on every table.** No exceptions, no "we'll add it later".
  Every workspace-scoped table joins on `workspace_id` in policy.

> The ledger is the **single source of historical truth**.
> If it isn't in the ledger, it didn't happen.

---

## 🚫 Anti-Patterns (Instant Rejection)

| Anti-pattern | Why it's banned |
|---|---|
| `any` in TypeScript | Defeats the type system; use `unknown` + guards |
| Hardcoded colors / spacing / `px` | Breaks Cognitive UI Adaptation |
| `pages/<Archetype><Feature>.tsx` quartets | Violates Law 2 |
| Direct `supabase.from().update()` from a page | Violates Law 6 |
| Storing roles or workspace on `profiles` | Privilege-escalation vector |
| Synchronous network on user action | Violates Law 3 |
| Hash-anchor "single-page" navigation | Kills SSR + SEO |
| Editing `routeTree.gen.ts` / supabase `client.ts` / `types.ts` | Auto-generated |
| Pricing math in components | Pricing Engine is the only oracle |
| AI output written to DB without Zod gate | Violates Law 5 |
| Branching JSX on archetype identity | Violates Law 4 — branch on DNA tokens |
| Calling a marketplace capability as a hard-coded import | Violates Law 1 |

---

## ✅ Definition of Done

A change is **done** when:
1. `tsc --noEmit` passes with **zero** errors and **zero** new `any`.
2. Every new table has RLS; every sensitive write goes through an RPC.
3. Workspace scoping (`workspaceQueryKey` / `workspaceStoragePath`) is applied.
4. Tokens — not raw colors — drive every visual decision.
5. The mutation path tolerates offline (queue + idempotency).
6. The capability is composable — no archetype-specific file copies.
7. AI hooks (if any) pass through Zod + guardrails before side-effects.
8. The change is logged in `ARCHITECTURAL_ROADMAP.md` with a phase id.

---

## The Engineer's Oath

> I will not hardcode what can be composed.
> I will not duplicate what can morph.
> I will not trust what can be verified.
> I will not block what can be queued.
> I will not paint what can be themed.
> I will not write what cannot be traced.
> I will audit before I act.
> I will leave the system stronger than I found it.

— *Principal Enterprise Architect, Salsabil OS*
