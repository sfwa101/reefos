# Khalil — P1 Event Flow Definitions

All Khalil events follow `khalil.<aggregate>.<verb_past_tense>`, are
append-only, versioned, and typed. Only gateways emit. Subscribers are
idempotent on `event.id` (Art. IV).

## MVP event catalog (locked)

| Event | Emitted by | Payload (essentials) | Subscribers |
|---|---|---|---|
| `khalil.prayer.logged` | `khalil.prayer.log.write` | `{ user_id, date, prayer, mode, at }` | analytics, identity, recovery, coach |
| `khalil.habit.completed` | `khalil.habit.complete.write` | `{ user_id, habit_id, date, partial }` | analytics, identity, coach |
| `khalil.habit.defined` | `khalil.habit.define.write` | `{ user_id, habit_id, name_key, cadence }` | analytics |
| `khalil.workout.session_started` | `khalil.workout.session.write` | `{ user_id, session_id, at }` | — |
| `khalil.workout.set_added` | `khalil.workout.set.write` | `{ user_id, session_id, set }` | analytics |
| `khalil.workout.session_closed` | `khalil.workout.session.write` | `{ user_id, session_id, duration_s, set_count }` | analytics, identity, coach |
| `khalil.weight.recorded` | `khalil.weight.measurement.write` | `{ user_id, kg, at }` | analytics |
| `khalil.recovery.changed` | `khalil.recovery.toggle` | `{ user_id, from, to, reason?, at }` | orchestrator, coach, **audit** |
| `khalil.identity.evolved` | identity engine (server) | `{ user_id, from, to, at }` | analytics, coach |
| `khalil.coach.proposed` | coach engine | `{ user_id, proposal_id, kind }` | analytics |
| `khalil.coach.accepted` | `khalil.coach.accept` | `{ user_id, proposal_id }` | analytics, **audit** |
| `khalil.coach.dismissed` | `khalil.coach.dismiss` | `{ user_id, proposal_id, reason? }` | analytics |

Every event additionally carries: `id`, `name`, `version`, `occurred_at`,
`actor_id`, `trace_id`, `correlation_id?`.

## Subscriber contracts

- **Idempotent.** Deduplicate by `event.id`.
- **Bounded.** A subscriber that needs >250ms must be queued, not inline.
- **Sovereign.** A subscriber never SELECTs from another domain's tables.
  It uses its own state + the event payload.

## Replay

All projections (`khalil_adherence_daily`, `khalil_identity_state`,
`khalil_recovery_state`, `khalil_streak_state`) must be rebuildable by
replaying events from the start. P2 ships a replay job alongside each
projection.

## Forbidden

- ❌ Mutating state without an event.
- ❌ Editing a past event (insert a `correction` event instead).
- ❌ Cross-domain consumers reading Khalil's internal projections directly
  (they consume the public event only).
- ❌ Synchronous chains across sub-domains in a single gateway handler.
  Sub-domains communicate via events, asynchronously.
