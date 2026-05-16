# Khalil — Analytics Architecture

## Default posture

**Private by default. Aggregate by exception. Public never.**

Every analytic that Khalil produces is the user's own mirror, computed
server-side from their own event stream. There is no implicit sharing, no
public profile, no opt-out telemetry.

## Layers

1. **Event stream** — append-only, per-user, RLS-scoped (`khalil_events`).
2. **Rollups** — materialized views or scheduled aggregations per user
   (heatmaps, adherence %, weekly summaries). Owned by `analytics/`
   sub-domain. Refreshed via events, not cron-on-everything.
3. **Self analytics** — exposed via `khalil.analytics.self.read`. The only
   analytics surface for end users.
4. **Operator analytics** — anonymized, PII-stripped, aggregated at the
   gateway. Requires `khalil.admin.analytics.aggregate.read`. Audited.

## Hard rules

- ❌ No third-party analytics SDK ever loads inside `/khalil/*` routes.
- ❌ No event payload contains free-text user content (journal entries,
   reflections) unless the user explicitly opts in per surface.
- ❌ No operator dashboard can resolve an aggregated metric back to an
   individual user. Aggregations use k-anonymity (k ≥ 25) at the gateway.
- ❌ No client-side analytics computation. Heatmaps, streaks, deltas, and
   adherence are all computed server-side and returned as typed view models.
- ❌ No "engagement" metrics fed back into product decisions about recovery
   or coach surfaces. Recovery is not an optimization target.

## Exported metrics (P1 target)

| Metric | Granularity | Source |
|---|---|---|
| Pillar adherence (rolling 7/30/90d) | Per pillar | event rollup |
| Prayer heatmap | Per day, per prayer | prayer events |
| Workout volume | Per week | workout events |
| Weight delta | Per measurement | weight events |
| Mood / energy bands | Per day | mood events |
| Identity-level history | Per transition | identity events |

## Forbidden patterns

- Mixing analytics queries into UI components.
- Live-tailing event tables from the browser.
- Storing raw model prompts in analytics — provenance lives in audit, not
  analytics.
