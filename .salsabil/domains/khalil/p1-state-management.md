# Khalil — P1 Client State Management Strategy

## Principle

> The server is the source of truth. The client caches projections.

No Redux. No Zustand global store. No domain "store" abstraction. State lives
in three tightly-scoped tiers:

| Tier | Tool | Used for |
|---|---|---|
| Server cache | `@tanstack/react-query` via `useServerFn` | All Khalil reads. Cache key = `["khalil", <area>, ...args]`. |
| Route state | TanStack Router search params + loaders | What screen, what filter window, what sub-section. |
| Ephemeral UI state | `useState` / `useReducer` colocated in the block | Open/close, draft input, optimistic toggles. |

## Cache contract

- Query keys are namespaced: `["khalil", subdomain, ...args]`.
- Invalidation happens **only** in response to a Khalil event surfaced via
  the events bus subscription, OR after a successful mutation in the same
  client. Never on a timer, never on focus blindly.
- Optimistic updates allowed for: habit complete, prayer log, recovery
  toggle. Forbidden for: identity level, coach proposals, analytics.
- On `onAuthStateChange`, `queryClient.invalidateQueries({ queryKey: ["khalil"] })`.

## What is NOT client state

- Identity level (server-attested; client renders the projection).
- Streaks (computed server-side).
- Recovery mode (server-owned state machine; client mirrors).
- Coach proposals (server-built; client may not mutate).

## Forbidden

- ❌ Putting Khalil state in `localStorage` except: language preference,
  default landing pillar, and the cache persister (which serializes
  React Query, not domain state directly).
- ❌ Cross-block prop drilling. Blocks read their own data through their
  own gateway hook.
- ❌ Context providers for domain data. Context is reserved for kernel
  concerns (auth, theme, i18n, locale).
- ❌ Sharing a mutable singleton between blocks.
