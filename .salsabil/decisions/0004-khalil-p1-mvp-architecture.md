# ADR-0004 — Khalil P1 Sovereign MVP Architecture

| Field | Value |
|---|---|
| Status | **Accepted** |
| Date | 2026-05-16 |
| Sponsor | Khalil Sovereign Council |
| Supersedes | — |
| Related | ADR-0002 (Khalil domain), ADR-0003 (P0.1 decoupling) |

## Context

P0 established the governance memory layer for Khalil. P0.1 decoupled
Khalil from Maeen and corrected ownership maps. The next risk is jumping
to implementation without freezing the MVP shape — a common path to
architectural collapse.

P1 freezes the MVP architecture **before any feature code is written**.

## Decision

Ratify the P1 deliverable bundle under `.salsabil/domains/khalil/p1-*.md`
as the binding implementation contract for the Khalil MVP:

- `p1-mvp-blueprint.md` — master contract.
- `p1-capability-ownership.md` — locked capability registry for MVP.
- `p1-runtime-flows.md` — sequence flows for the 10 MVP capabilities.
- `p1-state-management.md` — server-truth + React Query, no global stores.
- `p1-data-ownership.md` — `khalil_*` tables, RLS shape, cross-domain rules.
- `p1-event-flows.md` — `khalil.*` event catalog + subscriber contracts.
- `p1-composable-dashboard.md` — block registry, orchestrator-driven home.
- `p1-analytics-strategy.md` — private-by-default, projection-based.
- `p1-ai-coach-boundaries.md` — propose / dispose, schema-validated.
- `p1-i18n-strategy.md` — Arabic-first, zero literals, hot-switch ready.
- `p1-mobile-first.md` — 390px reference, performance budget, gesture rules.
- `p1-offline-pwa.md` — read-first offline + write-queue contract.
- `p1-feature-deferral.md` — everything explicitly excluded from MVP.
- `p1-architectural-risks.md` — 15 risks with mitigations and tripwires.

MVP scope is locked to 10 capabilities: Auth, Home Dashboard,
Prayer, Habits, Workout, Weight, Recovery, Identity Levels,
Basic Analytics, Basic AI Coach (shell).

## Consequences

**Positive**
- Implementation in P2 is mechanical: every decision is pre-made.
- Sovereign isolation, capability-first, server-attested truth, and
  composition-over-pages are enforced before code exists.
- Risk catalog with tripwires gives reviewers concrete reject criteria.
- Future ecosystem integrations remain possible without rewrites.

**Negative**
- P2 cannot start until ADR-K001…K006 (open architectural questions)
  are resolved with their own ADRs.
- Deferral list will create user-facing pressure to "just add one thing";
  ADR gate must hold.

## Alternatives considered

1. **Skip P1, start P2 with a minimal `src/apps/khalil/` scaffold.**
   Rejected: produces the exact "fast-MVP that collapses at scale" outcome
   the Salsabil constitution exists to prevent.
2. **Defer architecture docs until after MVP ships.**
   Rejected: violates Art. X (Governance-First Engineering).
3. **Adopt an off-the-shelf habit-tracker architecture.**
   Rejected: Khalil is not a habit tracker (per DOMAIN_MEMORY § 2).

## Blast radius

Documentation only. No code, no schema, no runtime changes in this ADR.

## Next step

Open ADR-K001 (Identity level mechanics) as the first blocker for P2.
