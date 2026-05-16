# Khalil — P1 Runtime Interaction Flows

Every MVP capability follows the canonical write/read paths from
`.salsabil/architecture/03-data-flow.md`. Diagrams below are normative.

## Canonical write (reference)

```text
UI intent
  → useServerFn(khalil.<area>.<verb>)
    → middleware: requireSupabaseAuth → requireCapability(<key>)
      → runtime (pure TS): invariants + state transition
        → supabase write (RLS-scoped to auth.uid())
        → emit khalil.<area>.<verb_past>
          → analytics rollup (idempotent on event.id)
          → identity engine (server-side, debounced)
          → coach engine (debounced, server-side)
          → audit (if sensitivity flag)
```

## Canonical read (reference)

```text
UI useQuery
  → useServerFn(khalil.<area>.read)
    → middleware: requireSupabaseAuth → requireCapability(<key>)
      → projection select (RLS) → typed DTO → render via descriptor
```

---

## Flow 1 — Authentication

Khalil reuses kernel auth. The Khalil wrapper at `/khalil/auth` is a thin
presentational shell that delegates to the shared sign-in surface and
redirects into `/khalil/` on success. No Khalil-owned auth tables.

## Flow 2 — Home dashboard (composition)

```text
GET /khalil/
  → loader: khalil.home.compose.read
    → orchestrator runtime: resolve which blocks to render today
      based on (recovery state, time-of-day, identity level, available pillars)
    → returns descriptor tree: [BlockId, props][]
  → AppBlockRenderer renders descriptors
  → each block lazy-loads its own data via its own gateway
```

The home page never SELECTs from prayer/habit/workout tables directly. It
only resolves which blocks to mount.

## Flow 3 — Prayer log

```text
[user taps "Fajr completed"]
  → useServerFn(khalil.prayer.log.write)({ prayer: "fajr", at: now, mode: "on-time" })
    → requireCapability("khalil.prayer.log.write")
    → runtime: validates window, dedupes per (user_id, date, prayer)
    → INSERT khalil_prayer_log
    → emit khalil.prayer.logged { prayer, mode, date }
      → analytics: increment daily adherence projection
      → identity engine: maybe-evolve (debounced)
      → recovery engine: clears "missed" pressure if applicable
```

Qadaa follows the same flow with `mode: "qadaa"`. Past-day insert is allowed
only with `mode: "qadaa"`; same-day with `mode: "on-time"` only inside window.

## Flow 4 — Habit complete

```text
[tap complete on habit X]
  → khalil.habit.complete.write({ habit_id, date, partial?: number })
    → invariant: habit belongs to user, date is today (yesterday only in
      recovery mode), partial in [0,1]
    → INSERT khalil_habit_completion
    → emit khalil.habit.completed
      → analytics rollup
      → identity engine (debounced)
      → coach engine refresh (debounced)
```

## Flow 5 — Workout session

```text
[start session] → khalil.workout.session.write (creates open session)
[add set]      → khalil.workout.set.write (append-only)
[end session]  → khalil.workout.session.write (close)
                → emit khalil.workout.session_closed
```

Sets are immutable once written. Corrections insert a `correction` set, never
UPDATE (Art. IV, Art. VII).

## Flow 6 — Weight measurement

```text
khalil.weight.measurement.write({ kg, at })
  → invariant: kg in plausible range, one per day max
  → INSERT khalil_weight_measurement
  → emit khalil.weight.recorded
    → analytics: recompute 7/30/90 deltas
```

## Flow 7 — Recovery toggle

```text
khalil.recovery.toggle({ to: "soft" | "hard" | "off", reason? })
  → state machine: validates transition
  → INSERT khalil_recovery_event (append-only)
  → emit khalil.recovery.changed
    → orchestrator: recomposes home for softened day
    → coach: switches to compassionate prompt set
  → AUDIT row written (sensitive even though "member")
```

## Flow 8 — Identity level (server-attested)

```text
trigger: any pillar event OR daily cron at user's local midnight
  → server-only computeLevel(user_id):
      reads materialized adherence over rolling 30/90/180d
      → applies threshold table (config-backed, Art. VII)
      → if level changed: INSERT khalil_identity_event { from, to, at }
      → emit khalil.identity.evolved
```

Client never computes level. Client never proposes a level. UI reads the
latest `khalil_identity_state` projection.

`khalil.identity.recompute` is the sovereign override — only the user
themselves, never an admin — that forces recomputation. Audited.

## Flow 9 — Basic analytics (private read)

```text
GET /khalil/insights
  → loader: khalil.analytics.private.read({ window: "30d" })
    → server reads pre-computed projections only (no on-the-fly aggregation)
    → returns: heatmap[], adherence_by_pillar[], deltas
```

No public sharing endpoint exists. No projection joins across domains.

## Flow 10 — AI coach (proposal only)

```text
[home block requests next proposal]
  → khalil.coach.propose.read({ context: minimal_snapshot })
    → server: builds prompt from server-side context (NOT from client input
      beyond a small allowlisted snapshot)
    → calls Salsabil AI gateway with capability sensitivity
    → validates response against ProposalSchema
    → returns { id, kind, copy_key, suggested_action?: CapabilityIntent }
  → UI renders proposal

[user taps accept]
  → khalil.coach.accept({ proposal_id })
    → server re-validates the proposal still applies
    → executes the suggested action via its own capability check
    → emit khalil.coach.accepted (audited)

[user taps dismiss]
  → khalil.coach.dismiss({ proposal_id, reason? })
    → emit khalil.coach.dismissed
```

The coach proposes; the user (via capability check) disposes. Art. XI.
