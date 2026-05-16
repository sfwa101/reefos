# Khalil — P1 Data Ownership Boundaries

## Naming

All Khalil tables are prefixed `khalil_`. No other domain may SELECT, INSERT,
UPDATE, or DELETE these tables from UI or from another domain's runtime.

ADR-K004 will decide whether to additionally isolate Khalil under its own
schema (`khalil.*`). MVP defaults to the `public.khalil_*` prefix to avoid
RLS / supabase-js complexity until proven necessary.

## MVP tables (locked shape, not yet migrated)

| Table | Purpose | Append-only? | Owner |
|---|---|---|---|
| `khalil_profile` | per-user khalil settings (timezone, default_pillar, language). One row per user. | no (settings) | identity |
| `khalil_prayer_log` | one row per prayer logged. (user, date, prayer, mode, at) | **yes** | prayer |
| `khalil_habit_definition` | user-defined habits (name_key, cadence, target). | soft-delete only | habit |
| `khalil_habit_completion` | append-only completion events. | **yes** | habit |
| `khalil_workout_session` | open/closed sessions. | append + close timestamp | workout |
| `khalil_workout_set` | append-only sets per session. | **yes** | workout |
| `khalil_weight_measurement` | one row per measurement. | **yes** | weight |
| `khalil_recovery_event` | append-only state transitions. | **yes** | recovery |
| `khalil_identity_event` | append-only level transitions. | **yes** | identity-evolution |
| `khalil_coach_proposal` | server-issued proposals + lifecycle. | append-only lifecycle rows in `khalil_coach_event` | coach |

## Projections (rebuildable from events)

| Projection | Source events | Read by |
|---|---|---|
| `khalil_adherence_daily` | prayer.logged, habit.completed | analytics, home block |
| `khalil_identity_state` | identity.evolved | identity chip, header |
| `khalil_recovery_state` | recovery.changed | orchestrator |
| `khalil_streak_state` | prayer + habit events | analytics |

Projections are **rebuildable**. Drift is fixed by replay, never by patch.

## RLS shape (every Khalil table)

```sql
alter table khalil_<x> enable row level security;
create policy "khalil_<x>_owner_select" on khalil_<x>
  for select using (auth.uid() = user_id);
create policy "khalil_<x>_owner_insert" on khalil_<x>
  for insert with check (auth.uid() = user_id);
-- UPDATE/DELETE only on settings/profile rows; append-only tables get no UPDATE/DELETE policy.
```

Capability checks happen in the gateway middleware **before** the RLS-bound
query runs. RLS is the backstop, not the primary gate.

## Cross-domain rules

- ❌ Reef commerce, vendor, cashier, logistics, marketing may NOT read from
  any `khalil_*` table.
- ❌ Khalil may NOT read from `orders`, `products`, `wallets`, `inventory`,
  `vendor_*`, `pos_*`, `kds_*`.
- ✅ Khalil MAY read `auth.users` indirectly via `requireSupabaseAuth`.
- ✅ Khalil MAY consume future `finance.subscription.changed` events
  read-only when subscription tiers gate optional features (post-MVP).

## Forbidden joins

Database joins across domain boundaries require an explicit cross-domain
contract and an ADR. None exist for MVP.
