# Khalil — P1 Sovereign MVP Architecture Blueprint

> Status: **PLAN ONLY.** No feature code is written in P1. This document is
> the contract that P2 implementation must obey. Any deviation requires an ADR.

---

## 1. Purpose of P1

P1 freezes the **shape** of the Khalil MVP before any feature code is written.
It defines: what exists, what is deferred, where each capability lives, how
runtime flows behave, and what is forbidden. P2 (implementation) is mechanical
once P1 is ratified.

The MVP must be small enough to ship, sovereign enough to survive, and
composable enough to evolve into a world-class transformation OS without
rewriting its foundations.

## 2. MVP scope (locked)

The MVP includes **only** these sovereign capabilities. Everything else is
deferred (see `p1-feature-deferral.md`).

| # | Capability | Sub-domain | UI surface |
|---|---|---|---|
| 1 | Authentication (reuses kernel) | `identity` (shared) | `/khalil/auth` (thin wrapper) |
| 2 | Home Dashboard (composable) | `orchestrator` | `/khalil/` |
| 3 | Prayer Tracking | `prayer` | block on home + `/khalil/prayer` |
| 4 | Daily Habits | `habit` | block on home + `/khalil/habits` |
| 5 | Workout Tracking | `workout` | block on home + `/khalil/workout` |
| 6 | Weight Tracking | `weight` | block on home + `/khalil/weight` |
| 7 | Recovery Mode | `recovery` | global state + `/khalil/recovery` |
| 8 | Identity Levels (server-attested) | `identity-evolution` | header chip + `/khalil/identity` |
| 9 | Basic Analytics (private) | `analytics` | block on home + `/khalil/insights` |
| 10 | Basic AI Coach (shell, read-only) | `coach` | block on home + `/khalil/coach` |

**Hard limits for MVP:**
- One language at launch: Arabic (RTL). i18n runtime ready for EN/TR but
  catalogs land empty until P3.
- Mobile-first only. Desktop layouts are derivative, not bespoke.
- No social, no sharing, no leaderboards, no streak shaming.
- AI Coach is **proposal-only**. No autonomous actions. No memory across days
  in MVP (single-turn context).

## 3. Architectural pillars (the five invariants)

These five rules govern every line of P2 code. If a PR violates any of them,
it is rejected.

1. **Sovereign isolation.** No Khalil file imports from another domain's
   `runtime/` or `gateway/`. Cross-domain talk = events + published contracts.
2. **Gateway monopoly.** UI never touches `supabase` directly. The only entry
   to data is `useServerFn(<gateway fn>)`.
3. **Capability-first.** Every mutation is gated by a capability key.
   No `if (user.role === ...)`. No `if (user.isAdmin)`.
4. **Server-attested truth.** Identity level, recovery transitions, streaks,
   and coach proposals are computed on the server. Clients render, never decide.
5. **Composition over pages.** Every screen is a descriptor tree rendered by
   the shared block registry. New surfaces register a block, not a route.

## 4. Layering (MVP target)

```text
src/apps/khalil/                    ← presentation (no supabase, no domain logic)
  routes/                           ← thin route shells, page descriptors only
  blocks/                           ← khalil.* blocks registered in shared registry
  i18n/                             ← JSON catalogs (ar required, en/tr stubs)
  theme/                            ← khalil.* tokens layered on global theme

src/core/khalil/                    ← sovereign domain (pure TS + gateways)
  index.ts                          ← public contract barrel (minimal)
  schemas.ts                        ← shared zod schemas
  events.ts                         ← khalil.* event names + payload schemas
  gateway/                          ← createServerFn entrypoints, one file per area
  runtime/                          ← pure logic, no React, no supabase
  identity/  prayer/  habit/  workout/  weight/  mood/  recovery/
  coach/  analytics/  orchestrator/

Kernel (untouched)                  ← auth, capabilities, events, sdui, i18n
```

Dependencies always flow downward. The kernel is never modified to satisfy
Khalil — if Khalil needs a primitive, it adds a sub-domain or proposes a
kernel addition via ADR.

## 5. Deliverable index

| Document | Purpose |
|---|---|
| `p1-mvp-blueprint.md` (this file) | Master contract for P1. |
| `p1-capability-ownership.md` | Every capability key, owner, sensitivity. |
| `p1-runtime-flows.md` | Sequence diagrams for the 10 MVP capabilities. |
| `p1-state-management.md` | Client cache strategy, no global stores. |
| `p1-data-ownership.md` | Tables, prefixes, RLS shape, cross-domain rules. |
| `p1-event-flows.md` | Event catalog + subscribers (MVP slice). |
| `p1-composable-dashboard.md` | Block registry contract for the home surface. |
| `p1-analytics-strategy.md` | Private-by-default collection + projections. |
| `p1-ai-coach-boundaries.md` | What the coach is allowed and forbidden to do. |
| `p1-i18n-strategy.md` | Catalog ownership, hot-switch, zero-literal rule. |
| `p1-mobile-first.md` | Breakpoint contract, gesture rules, safe-areas. |
| `p1-offline-pwa.md` | Offline read/write contract, sync, conflicts. |
| `p1-feature-deferral.md` | Everything explicitly NOT in MVP and why. |
| `p1-architectural-risks.md` | Known risks + mitigations + tripwires. |

## 6. What "done" means for P1

P1 is complete when:
- All 14 documents above exist and are internally consistent.
- An ADR (ADR-0004) ratifies the P1 plan as the implementation contract.
- The capability ownership map names every key the MVP will use.
- The deferral plan explicitly lists every excluded feature so no one
  smuggles it in during P2.

P1 produces **zero** runtime code. The next step (P2) is a separate ADR.

## 7. Anti-goals for P1

- ❌ Writing any TSX, server fn, or migration.
- ❌ Designing screens visually (that is P2.UI after architecture is locked).
- ❌ Choosing an AI model. The coach contract is provider-agnostic.
- ❌ Picking a chart library. Analytics contracts return shapes, not visuals.
- ❌ Optimizing performance. There is nothing to optimize yet.

## 8. Open ADRs blocking P2

| ID | Question |
|---|---|
| ADR-K001 | Identity level mechanics (server fn + materialized view? rolling window size?). |
| ADR-K002 | Coach prompt provenance + capability sensitivity. |
| ADR-K003 | Recovery mode state machine (events, transitions, side effects). |
| ADR-K004 | Per-pillar data isolation (separate schemas vs. shared `khalil_` prefix). |
| ADR-K005 | Khalil onboarding ritual (flow, capability grants, consent storage). |
| ADR-K006 | Offline-first write log shape (per `p1-offline-pwa.md`). |

P2 cannot start until ADR-K001…K006 are resolved.
