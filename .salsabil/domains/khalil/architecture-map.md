# Khalil — Architecture Map

## Macro layering

```text
                ┌─────────────────────────────────────────┐
                │  src/apps/khalil/  (presentation only)  │
                │  routes, screens, blocks, i18n, theme   │
                └─────────────────┬───────────────────────┘
                                  │  (hooks only)
                ┌─────────────────▼───────────────────────┐
                │  src/core/khalil/gateway/               │
                │  Typed RPC entrypoints (server fns)     │
                └─────────────────┬───────────────────────┘
                                  │
                ┌─────────────────▼───────────────────────┐
                │  src/core/khalil/runtime/               │
                │  Pure domain logic, state machines,     │
                │  event emitters, schedulers             │
                └─────────────────┬───────────────────────┘
                                  │
                ┌─────────────────▼───────────────────────┐
                │  Kernel  (identity, capabilities,       │
                │  events, RLS, audit)                    │
                └─────────────────────────────────────────┘
```

## Folder ownership

| Path | Owner | Allowed imports |
|---|---|---|
| `src/apps/khalil/` | Presentation | `@/core/khalil/*` hooks only, shared UI, i18n. **Never** `@/integrations/supabase/*`. |
| `src/core/khalil/gateway/` | Domain RPC | `@/integrations/supabase/auth-middleware`, kernel utilities. **Never** another domain's gateway. |
| `src/core/khalil/runtime/` | Domain logic | Pure TS only. No React. No Supabase. |
| `src/core/khalil/schemas.ts` | Contracts | Zod schemas shared between gateway + runtime. |
| `src/core/khalil/events.ts` | Contracts | Event names + payload schemas. |

## Dependency rules

1. Dependencies always point **downward** (apps → core → kernel).
2. **No** Khalil file may import from `src/core/reef-*`, `src/core/commerce`,
   `src/core/cashier`, `src/core/logistics`, `src/core/vendor`.
3. Cross-domain communication is via **events** or **capabilities** only.
4. UI never imports `supabase` directly (Art. IV).
5. Server fns never read `process.env` at module scope (Art. XI).

## Sub-domains (Phase P1+)

Each sub-domain owns its own `gateway/`, `runtime/`, `schemas.ts`, `events.ts`:

```text
src/core/khalil/
  identity/      ← level, archetype, evolution events
  prayer/        ← 5 daily, qadaa, intention modes
  habit/         ← definitions, adherence, partials
  workout/       ← sessions, sets, calisthenics, MMA
  weight/        ← measurements, deltas
  mood/          ← energy, mood, recovery hints
  recovery/      ← first-class state machine
  coach/         ← AI proposals (server-only)
  analytics/     ← private heatmaps, adherence rollups
  orchestrator/  ← composes the daily plan from pillars
```

## Composition over pages

Per Art. VIII, Khalil's UI is built from **descriptors** rendered by the
shared block registry. New surfaces register a block, not a route. Routes
exist only to host top-level page descriptors.

## What lives in the kernel, not in Khalil

- Auth + session management.
- Capability registry + resolver.
- Event bus + audit emitter.
- i18n runtime.
- Theme runtime.
- Shared UI primitives (`@/components/ui/*`).

If Khalil needs a primitive that doesn't exist, add it to shared UI via ADR
— never duplicate inside `apps/khalil/`.
