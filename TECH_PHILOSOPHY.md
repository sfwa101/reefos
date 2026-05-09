# ⚙️ TECH_PHILOSOPHY.md — Salsabil OS Engineering Constitution

> **The Engineering Constraints**
> Companion to [`VISION.md`](./VISION.md).
> Where VISION says *what we are building*, this document says
> **how we are allowed to build it**. These rules are non-negotiable.

---

## 0. Prime Directive

> **Constraints are features.**
> Every rule below exists because its absence has, somewhere in software
> history, killed a great product. We accept the friction.

---

## 1. 🎨 Constraint-Based Design System

The visual editor, the SDUI engine, and every drag-and-drop surface
**must NOT** emit pixels, HTML, or component trees. They emit
**Declarative Runtime Schemas** — typed *intents* that describe
*what is meant*, not *how it looks*.

```ts
// ❌ FORBIDDEN
{ type: "div", style: { padding: 12, background: "#fff" }, children: [...] }

// ✅ REQUIRED
{ intent: "capability.orders.queue", scope: "branch", density: "auto" }
```

**Why:** the renderer chooses pixels based on Interface DNA, theme,
device, and tenant. The same intent renders as a dense table for a
manager and as swipeable cards for a cashier. **Pixels are the output
of a function, never an input to it.**

Concrete rules:
- All editor outputs go through `core-os/sdui-engine/` schema validation.
- No hex colors, no `px` values, no inline `style={}` in any block.
- Tokens (`var(--*)`) are the only units of style.
- A schema with unknown `intent` must **fail closed**, never render raw.

---

## 2. ⚡ Local-First Runtime (Hyper-Speed Architecture)

The network is treated as an **enhancement**, not a dependency.
Every operator action must succeed *instantly* on the device, then
reconcile with the server in the background.

Required mechanics:
- **Incremental hydration** — route islands hydrate on visibility, not
  on page load.
- **IndexedDB cache** — TanStack Query persistence (`queryPersister.ts`)
  with tenant-scoped keys (`tenantQueryKey`).
- **Offline mutation queue** — `lib/offlineSyncQueue.ts` absorbs writes
  when offline; `useBackgroundSyncManager` drains on reconnect.
- **Optimistic UI by default** — every mutation patches the cache before
  the network round-trip.
- **Idempotency keys on every write** — duplicate flushes are safe.
- **Visibility-aware sockets** — `useVisibilitySocket` disconnects when
  the tab is hidden, reconnects on focus.

**Latency budget:** *0 ms perceived* for any operator action.
If a button waits on the network to respond, it is a bug.

---

## 3. 🧬 Stem Cell Architecture

We do **not** duplicate files per role. A `CashierOrders.tsx`,
`DriverOrders.tsx`, `VendorOrders.tsx`, `AdminOrders.tsx` quartet is a
**code smell** — it means the system has lost its DNA awareness.

Required pattern:
- One capability module (`features/orders/`) — many adaptive surfaces.
- Role/DNA differences expressed via **props, slots, and Composer
  decisions** — never via parallel file trees.
- Modules are isolated stem cells (see [Manifesto §1.1](./docs/REEF_ALMADINA_MANIFESTO.md))
  but **internally adaptive**.
- Cross-module imports remain forbidden. Sharing happens through
  `core-os/`, `context/`, `lib/`, never `modules/A → modules/B`.

> The system grows by **differentiation**, not by **duplication**.

---

## 4. 🌗 Neuroadaptive Themes

Themes are not a color palette. Themes are **cognitive contracts**:

| Audience | Contrast | Density | Motion | Tap target |
|---|---|---|---|---|
| Cashier (high-stress, fast) | Maximum | Low | None | ≥ 56px |
| Driver (outdoor, glove) | Sun-readable | Medium | Minimal | ≥ 64px |
| Manager (focus, depth) | Comfortable | High | Subtle | Standard |
| Customer (delight) | Branded | Medium | Expressive | Standard |
| Night-shift / dim ambient | Low-blue | Low | None | ≥ 56px |

Implementation:
- Tokens defined in `src/styles.css` using `oklch()` — never raw hex.
- `SovereignThemeProvider` resolves the active token set from DNA.
- Components consume **semantic** tokens (`--surface`, `--ink`,
  `--accent-critical`) — never `bg-white`, never `text-black`.
- New colors are added to `styles.css` first, used in code second.

---

## 5. 🛡️ Zero-Trust Execution

Trust is earned per-call, never per-session.

Required disciplines:
- **Audit before writing** — read the relevant files, schemas, and RLS
  before any structural change. (See `EXECUTION_PLAYBOOK.md`.)
- **Tenant isolation by construction** — every query key prefixed via
  `tenantQueryKey()`, every storage path via `tenantStoragePath()`.
- **RLS on every table** — `has_role(auth.uid(), …)` from a `SECURITY
  DEFINER` function; roles in a separate `user_roles` table.
- **Server-side validation always** — client checks are UX, not security.
- **Idempotency everywhere** — replay-safe via deterministic keys.
- **Circuit breakers cannot be bypassed** — `LossPreventionRule`,
  rate limiters, and admin overrides are **logged, not silenced**.
- **Secrets never in code** — `.env` is auto-managed; secrets via the
  secrets vault.
- **Security headers in production** — CSP, HSTS, X-Frame-Options,
  Permissions-Policy enforced in `start.ts` (host-aware for preview).

> **Audit, then act. Never the reverse.**

---

## 6. 🚫 Anti-Patterns (Instant Rejection)

| Anti-pattern | Why it's banned |
|---|---|
| `any` in TypeScript | Defeats the type system; use `unknown` + guards |
| Hardcoded colors / spacing | Breaks neuroadaptive themes |
| `pages/<Role><Feature>.tsx` quartets | Violates Stem Cell rule |
| Direct `supabase.from().update()` from a page | Bypasses RPC + audit |
| Storing roles on `profiles` | Privilege-escalation vector |
| Synchronous network on user action | Violates Hyper-Speed |
| Hash-anchor "single-page" navigation | Kills SSR + SEO |
| Editing `routeTree.gen.ts` | Auto-generated; never touch |
| Editing `integrations/supabase/client.ts` or `types.ts` | Auto-generated |
| Pricing math in components (`* 0.95`) | Pricing Engine is the only oracle |

---

## 7. ✅ Definition of Done

A change is **done** when:
1. `tsc --noEmit` passes with **zero** errors and **zero** new `any`.
2. RLS exists for any new table; no client bypasses RPCs.
3. Tenant scoping (`tenantQueryKey`/`tenantStoragePath`) is applied.
4. Tokens — not raw colors — drive every visual decision.
5. The mutation path tolerates offline (queue + idempotency).
6. The capability is composable — no role-specific file copies.
7. AI hooks (if relevant) are wired through Hakim, not bolted on.
8. The change is logged in `ARCHITECTURAL_ROADMAP.md` with a phase id.

---

## 8. The Engineer's Oath

> I will not hardcode what can be composed.
> I will not duplicate what can adapt.
> I will not trust what can be verified.
> I will not block what can be queued.
> I will not paint what can be themed.
> I will audit before I write.
> I will leave the system stronger than I found it.

— *Principal Enterprise Architect, Salsabil OS*
