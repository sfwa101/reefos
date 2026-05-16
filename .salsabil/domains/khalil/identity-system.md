# Khalil — Identity System

## Premise

Identity is **what the user repeatedly does**, not what the user declares. The
Khalil identity system is a server-attested model of who the user is becoming.
It is **never** a score, never a leaderboard, never visible to anyone else.

## Levels

| Level | Internal name | Meaning |
|---|---|---|
| 0 | `seed` | First contact. No history. Coach is gentle, observational. |
| 1 | `forming` | A rhythm is starting to appear. Coach reinforces, doesn't push. |
| 2 | `consistent` | Sustained adherence across ≥ 2 pillars for ≥ 30 days. |
| 3 | `integrated` | Pillars compound. Recovery is graceful, not shameful. |
| 4 | `sovereign` | Self-correcting. Coach steps back into a witness role. |

## Mechanics

- Levels are **computed server-side** from immutable event history.
- Level transitions are **events**, not mutations: `khalil.identity.evolved`.
- The user **cannot** be demoted by missing days — recovery mode protects continuity.
- The user **cannot** game levels — every contributing event is capability-gated and audit-logged at the gateway.
- The model is **archetypal**, not numeric. We do not show "78/100 to next level". We show *what the next chapter of the user looks like*.

## Archetypes (orthogonal to levels)

Selected during onboarding, mutable through reflection rituals — not through a settings toggle:

- **The Disciplined** — focus on consistency and ritual.
- **The Builder** — focus on physical evolution and capability.
- **The Contemplative** — focus on spirit, dhikr, depth.
- **The Recovering** — explicit, dignified — first-class, not a failure label.

Each archetype shapes which proposals the coach surfaces first, the daily
orchestrator's defaults, and the visual tone of the dashboard. None of them
unlock or block features.

## Anti-features (forbidden)

- ❌ Public profile / shareable badge.
- ❌ Streak counter shown as the primary metric.
- ❌ "You lost your streak" notifications.
- ❌ "Compare with friends".
- ❌ Any UI that frames the user as failing.
