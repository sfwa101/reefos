# Khalil — Runtime Flow

## Request lifecycle (client → server → event)

```text
[User action in src/apps/khalil/*]
        │
        ▼
[useServerFn(<gateway fn>)]            ← only entry point allowed
        │
        ▼
[Gateway server fn] ─── .middleware([requireSupabaseAuth, requireWorkspace, requireCapability(<key>)])
        │
        ▼
[Runtime (pure TS)] ─── validates business invariants, computes state transitions
        │
        ▼
[Persist via RLS-scoped supabase client]
        │
        ├──▶ [emit khalil.<area>.<verb>] (event bus)
        │
        └──▶ [audit emitter if sensitivity ≥ financial]
        │
        ▼
[Return typed result to client]
```

## Event lifecycle

```text
khalil.habit.completed
   │
   ├──▶ analytics rollup (async, idempotent)
   ├──▶ identity engine: maybe-evolve level (server-only, never client-asserted)
   ├──▶ coach engine: refresh next proposal (debounced)
   └──▶ recovery engine: clears "missed" pressure
```

Every Khalil event is:
- **Append-only.** Past events are immutable (Art. VII).
- **Self-contained.** Consumers never join across domains in their handlers.
- **Schema-validated.** Schemas live in `src/core/khalil/<sub>/events.ts`.

## State machines (P1 targets)

| Machine | States | Transitions trigger |
|---|---|---|
| `identity-level` | `seed → forming → consistent → integrated → sovereign` | server-computed from rolling 30/90/180-day adherence. **Never** decided by the client. |
| `recovery-mode` | `off → soft → hard → restoring` | user-triggered (`khalil.recovery.toggle`) OR coach-proposed + user-accepted. |
| `day-orchestrator` | `planned → in-progress → reflected → closed` | time-of-day + completion events. |

## Forbidden runtime patterns

- Client-side identity-level computation.
- Client-side capability resolution.
- Direct `supabase.from("khalil_*")` from UI.
- Mutating a past day's events to "fix" history (insert a `correction` event instead).
- Synchronous chained writes across sub-domains (use events).
