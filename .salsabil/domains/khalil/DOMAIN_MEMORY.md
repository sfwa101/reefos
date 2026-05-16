# Khalil — Domain Memory

| Field | Value |
|---|---|
| **Codename** | `khalil` |
| **Arabic name** | خليل |
| **Phase** | P0 — Governance Scaffold (no runtime features yet) |
| **Sovereignty** | Standalone domain, standalone brand, standalone URL, standalone auth flow, standalone UX. Hosted **inside** the Salsabil ecosystem. |
| **Owners** | Khalil Sovereign Council |
| **Status** | `design` (per `OS_COMPANIES`) |

---

## 1. Purpose

Khalil is **not** a habit tracker. Khalil is a **sovereign AI-guided human
transformation operating system** — an adaptive discipline runtime that helps
a user rebuild identity, sustain discipline, recover from failure, and evolve
spiritually, physically, and mentally.

Khalil exists to answer one question, every day, for one human:

> "Who am I becoming today, and what does today demand of that person?"

## 2. Non-goals (forbidden scope creep)

- ❌ Generic to-do / Kanban / project management.
- ❌ Productivity dopamine loops, streak shaming, leaderboard gamification.
- ❌ Social feed, follower counts, public profiles.
- ❌ Coupling to Reef commerce, POS, vendor, or logistics surfaces.
- ❌ Becoming a "super-app launcher". (That role belongs to Maeen / the OS notch.)

## 3. Sovereign boundaries

| Boundary | Rule |
|---|---|
| **URL** | Khalil owns `/khalil/*`. No other domain may render under that prefix. |
| **Auth** | Reuses Salsabil identity (`auth.users`, `requireSupabaseAuth`, `whoAmI`) but exposes its **own** onboarding ritual and consent surface. No Reef account flow is shown. |
| **Theme** | Owns its own theme tokens (`khalil.*`) layered on top of the global system. Cyber-minimal spiritual elegance — see `design-language.md`. |
| **Data** | All Khalil tables live under a `khalil_*` prefix. No cross-domain SELECTs from UI. |
| **Events** | Emits `khalil.*` events on the shared bus. Consumes nothing outside `identity.*` and `finance.*` (read-only, future). |
| **Capabilities** | All Khalil capabilities are keyed `khalil.<area>.<verb>` and registered in the central `CapabilityRegistry`. |

## 4. Pillars (architectural, not features)

1. **Identity Evolution** — adaptive level system based on sustained behavior, not points.
2. **Spiritual Discipline** — prayer, Qur'an, fasting, dhikr.
3. **Physical Evolution** — training, calisthenics, MMA, body composition.
4. **Cognitive & Emotional Regulation** — focus, mood, energy, recovery.
5. **AI Companion (Khalil Coach)** — adaptive, calm, non-shaming, server-attested.
6. **Adaptive Daily Orchestrator** — composes the day from pillars based on energy/state.
7. **Recovery Mode** — first-class state, not a failure path.

Each pillar maps to a sub-domain inside `src/core/khalil/<pillar>/` with its own
gateway, runtime, schemas, and events. None of them import from each other —
they cooperate only via the event bus and capability checks.

## 5. Architectural philosophy (inherited + specialized)

Khalil obeys every article of `.salsabil/constitution/`. The articles that
bind it most tightly:

- **Art. II — Evolutionary Sovereign Architecture**: every Khalil contract
  must remain replaceable. The AI coach, the analytics engine, and the
  scheduler must each be swappable without rewriting the others.
- **Art. III — Capability-First**: no `if (user.isAdmin)` and no `if (user.hasKhalil)`.
  Every gate is a capability key.
- **Art. IV — Event-Driven Runtime**: identity-level changes, recovery-mode
  toggles, and discipline streaks are **events**, not mutations.
- **Art. V — Domain Sovereignty**: Khalil never reaches into Reef tables and
  Reef never reaches into Khalil tables.
- **Art. VII — Anti-Hardcoding**: pillar weights, level thresholds, coach
  prompts, recovery rules, copy strings — all live in DB-backed config or
  i18n catalogs. Zero literals in components.
- **Art. IX — Kernel Minimalism**: Khalil's kernel exposes only what other
  domains might one day need; everything else stays private to the domain.
- **Art. XI — AI Execution Constraints**: the AI coach **proposes**;
  capability-bearing user actions **dispose**.

## 6. MVP scope (Phase P1, post-governance)

Once this memory layer is ratified, the first executable slice is:

1. Home dashboard (composition over fixed page).
2. Prayer system (5 daily, qadaa backlog, intention modes).
3. Daily habits engine (DB-driven, capability-gated).
4. Workout tracking (sessions + sets, no social).
5. Weight tracking (private, with delta visualization).
6. Basic analytics (heatmap + adherence, no public sharing).
7. Recovery mode (first-class state machine).
8. Identity levels (server-computed, never client-asserted).
9. Basic AI coach (read-only proposals).

Anything outside this list waits for an ADR.

## 7. Languages

- Arabic (default, RTL).
- English (LTR).
- Turkish (LTR).

Architecture must support hot language switching without a reload. Translation
units live in JSON catalogs under `src/apps/khalil/i18n/`. **Zero** Arabic
literals embedded in TSX.

## 8. Related governance files

- `capability-map.md` — declared capability keys + sensitivities.
- `architecture-map.md` — layering, ownership, dependency rules.
- `runtime-flow.md` — request and event lifecycles.
- `identity-system.md` — level mechanics, no points, no shaming.
- `psychology-engine.md` — behavioral model and ethical guardrails.
- `ai-coach-philosophy.md` — what the coach is allowed and forbidden to do.
- `analytics-architecture.md` — private-by-default analytics design.
- `anti-pattern-report.md` — current debt and known traps.
- `duplication-report.md` — what must NOT be reinvented inside Khalil.
- `future-integrations.md` — explicit forward-looking integration contracts.
- `design-language.md` — visual + motion direction.
- `i18n-strategy.md` — translation catalog ownership.

## 9. Open questions (must be answered by ADR before implementation)

- ADR-K001: Identity level mechanics (server function + materialized view?).
- ADR-K002: Coach prompt provenance — which Salsabil AI gateway, with what
  capability sensitivity?
- ADR-K003: Recovery mode state machine — events, transitions, side effects.
- ADR-K004: Per-pillar data isolation — separate schemas vs. shared prefix?
- ADR-K005: Khalil's own onboarding ritual — flow, capability grants,
  consent storage.
