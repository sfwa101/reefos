# Khalil — P1 Composable Dashboard Strategy

## Principle (Art. VIII)

Khalil's home is **not a page**. It is a descriptor tree resolved by the
orchestrator and rendered by the shared block registry. No bespoke pages.

## Block contract

A Khalil block:
- Is registered with id `khalil.<area>.<block>` in the shared registry.
- Receives serializable props only (no functions, no JSX, no class instances).
- Loads its own data via its own gateway hook.
- Owns its own loading + empty + error states.
- Emits no events except via its gateway.

## MVP block catalog

| Block id | Purpose | Mounts on |
|---|---|---|
| `khalil.identity.chip` | Current level + next-threshold hint. | header, home |
| `khalil.prayer.today` | 5-prayer status today + quick-log. | home, `/khalil/prayer` |
| `khalil.habit.today` | Today's habits + quick-complete. | home, `/khalil/habits` |
| `khalil.workout.next` | Next session + start CTA. | home, `/khalil/workout` |
| `khalil.weight.trend` | 30d trend sparkline + log button. | home, `/khalil/weight` |
| `khalil.recovery.banner` | Visible only when state ≠ off. | global, top of home |
| `khalil.coach.proposal` | One proposal at a time, accept/dismiss. | home, `/khalil/coach` |
| `khalil.analytics.heatmap` | 12-week adherence heatmap. | home, `/khalil/insights` |
| `khalil.analytics.adherence` | Per-pillar adherence bars. | `/khalil/insights` |

## Orchestrator resolution rule

```text
orchestrator.composeHome(user) :=
  filter blocks by:
    - capabilities the user holds
    - recovery state (soft/hard hides workout + analytics depth)
    - time-of-day (prayer block emphasis shifts by next salah)
    - identity level (no block is gated by level in MVP, only ordered)
  order blocks by:
    - urgency score (computed server-side, never client)
  return descriptor tree
```

The resolution is **pure server logic**. The client just renders.

## Forbidden

- ❌ A bespoke `HomePage.tsx` that hard-codes block order.
- ❌ Conditional rendering of blocks in TSX based on user identity.
- ❌ Blocks importing each other.
- ❌ A block reading another block's React state.
