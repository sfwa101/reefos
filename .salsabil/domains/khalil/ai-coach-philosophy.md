# Khalil — AI Coach Philosophy

## Core stance

The Khalil Coach is a **witness, then a companion, then a strategist** — in
that order. It is built on the Salsabil AI gateway (Lovable AI) and obeys
Art. XI of the constitution: **AI proposes, capability-bearing users dispose.**

## What the coach IS

- A **proposal engine**. Every coach output is a suggestion, never a mutation.
- **Server-attested**. The coach runs only inside server functions; the
  client receives finalized, schema-validated proposals.
- **Context-aware**. It reads the user's own event history (read-only,
  RLS-scoped) plus shared content catalogs.
- **Calm**. Tone is precise, non-clinical, non-cheerleading.
- **Multilingual**. AR / EN / TR, with archetype-aware register.
- **Audited**. Every proposal carries a provenance record (`coach.proposal.created`).

## What the coach is NOT

- ❌ A chat-spam bot. It does not nudge unprompted unless the orchestrator
  signals a meaningful inflection (e.g. seventh consecutive missed prayer).
- ❌ A medical, legal, or financial advisor.
- ❌ A scolder. It does not use shame, urgency, or fear.
- ❌ A leak vector. It never sees another user's data. It never sees raw PII
  beyond what the gateway exposes (display name + archetype + scoped events).
- ❌ A drift surface. The coach cannot mutate user data; only the user can,
  by accepting a proposal via `khalil.coach.accept`.

## Architecture

```text
[Client] ──useServerFn──▶ [coach.proposeNext server fn]
                              │  middleware:
                              │    requireSupabaseAuth
                              │    requireWorkspace
                              │    requireCapability("khalil.coach.read")
                              │
                              ▼
                          [coach runtime]
                              │  reads RLS-scoped events
                              │  composes prompt from catalog (DB-driven)
                              │  calls LOVABLE_API_KEY gateway (server-only)
                              │  validates output against ProposalSchema
                              │
                              ▼
                          [returns Proposal[]]
                              │
                              ▼
              [client renders; user taps accept]
                              │
                              ▼
[coach.acceptProposal server fn] ─▶ records consent, emits khalil.coach.accepted
```

## Prompt provenance

Prompts are **not** literals in TypeScript. They live in a `khalil_coach_prompts`
table, versioned, with locale variants. Editing requires `khalil.admin.coach.tune`
(sovereign). Every prompt revision is an event.

## Failure modes (must be handled)

- Gateway timeout → return a typed `{ kind: "unavailable" }` proposal. The UI
  shows a calm "Coach is resting" state. No retries are surfaced to the user.
- Schema violation → drop the response, log a `coach.proposal.invalid` event,
  return `unavailable`. Never render unvalidated coach text.
- Crisis signal in user state → coach is suppressed; UI surfaces a static,
  human-curated resource block instead.
