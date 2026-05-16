# Article IV — Event-Driven Runtime

> State is a projection. Events are the truth.

## Rules

- Events are append-only, immutable, versioned, typed.
- Naming: `<domain>.<aggregate>.<verb_past_tense>`.
- Only gateways and server functions emit events.
- Subscribers are idempotent on `event.id`.
- Projections rebuild from the log; drift is corrected by replay, not patching.

## Forbidden

- Mutating state without an event.
- Editing past events.
- Cross-domain consumers reading another domain's internal projection.

See `runtime/events.md` for the event catalog contract.
