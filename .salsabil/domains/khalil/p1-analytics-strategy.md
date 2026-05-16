# Khalil — P1 Analytics Strategy

## Principle

> Analytics in Khalil are **private**, **personal**, and **non-comparative**.
> No leaderboards. No streak shaming. No social sharing. Ever.

## Collection model

Khalil never collects analytics through a separate event pipeline. The
domain events (`khalil.*.*`) ARE the analytics source. A subscriber writes
projections; reads consume projections.

## MVP projections

| Projection | Granularity | Rebuildable from |
|---|---|---|
| `khalil_adherence_daily` | (user, date) | prayer.logged + habit.completed |
| `khalil_streak_state` | (user) | prayer + habit events |
| `khalil_weight_trend` | (user, week) | weight.recorded |
| `khalil_workout_volume_weekly` | (user, week) | workout.set_added + session_closed |

## Allowed reads (MVP)

- 12-week heatmap of adherence.
- Per-pillar adherence (last 30 days).
- Weight delta (7d / 30d / 90d).
- Workout volume (last 4 weeks).

That's it. No other report ships in MVP.

## Forbidden

- ❌ Cross-user comparison.
- ❌ Public profile or share link.
- ❌ "Better than X% of users" framing.
- ❌ Exporting another user's data.
- ❌ Sending Khalil analytics to a third-party analytics SDK (PostHog,
  Mixpanel, GA, etc.) — even anonymized. Khalil data does not leave the
  user's tenant in MVP.

## Sensitivity

Khalil analytics are treated as personal-health-adjacent data. RLS on every
projection. No `auth.role() = 'service_role'` reads from UI surfaces. Admin
dashboards in other domains MUST NOT surface Khalil rollups.
