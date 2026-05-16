# Khalil — P1 Feature Deferral Plan

Every item below is **explicitly excluded from MVP**. Inclusion requires
its own ADR.

## Deferred to P3 (post-MVP)

- English + Turkish catalog content (runtime is ready in P2).
- Coach cross-day memory and conversational shell.
- Coach voice input/output.
- Full offline-first (current MVP is read-first + write-queue).
- Identity archetypes (only level mechanics ship in MVP).
- Onboarding ritual beyond a single welcome screen (ADR-K005).
- Custom habit cadences beyond daily / weekly-N (cron-style cadences later).
- Workout exercise library + progression suggestions.
- Body composition (waist, body fat) beyond bare weight.
- Sleep, hydration, nutrition pillars.
- Qur'an reading tracking, dhikr counters.
- Fasting tracker (Ramadan + voluntary).
- Mood/energy journaling beyond what recovery toggle implies.
- Notifications / push reminders.
- Family/circle private accountability (one-to-one only, future).
- Wearable integrations (Apple Health, Google Fit).
- Calendar integration.

## Deferred to P4+ (ecosystem integrations)

- Khalil → Maeen launcher surface card.
- Khalil → Reef wellness commerce cross-sells (capability-gated, opt-in).
- Khalil → Salsabil finance event consumption (e.g. tier-based unlocks).
- Coaching marketplace (human coach overlay).
- Group cohorts (still no leaderboards).
- Public testimonials surface (opt-in, fully separate domain).

## Permanently out of scope

- ❌ Public profiles or social feed.
- ❌ Streak-shaming notifications.
- ❌ Cross-user comparison or leaderboards.
- ❌ Medical or pharmaceutical advice.
- ❌ Religious rulings (fatwa). Coach copy is encouragement, never ijtihad.
- ❌ Monetization of user data.
- ❌ Becoming a habit-tracker clone.

## How to propose adding any deferred item

1. Open an ADR under `.salsabil/decisions/`.
2. State the user problem and why the existing MVP cannot serve it.
3. Identify which capability key, sub-domain, events, and projections it
   adds.
4. Show the architectural diff against this deferral list.
5. Get sponsor sign-off before P2 implementation begins.
