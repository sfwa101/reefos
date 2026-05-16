# Khalil — P1 AI Coach Integration Boundaries

## Philosophy (re-stated, normative for MVP)

> The coach **proposes**. The user, via capability checks, **disposes**.
> The coach never acts autonomously. The coach never shames. The coach
> never compares the user to another human.

## MVP scope (shell only)

- One proposal at a time, surfaced via `khalil.coach.proposal` block.
- Single-turn context. No memory across days in MVP.
- Server-built prompt from a small, allowlisted snapshot of the user's
  recent state. NEVER from raw client input.
- Proposal kinds (MVP): `gentle-reminder`, `recovery-suggestion`,
  `pillar-rebalance-hint`. No diagnosis, no medical claims, no spiritual rulings.

## Integration boundary

```text
                         ┌──────────────────────────────┐
                         │  Salsabil AI Gateway         │
                         │  (kernel, capability-gated)  │
                         └─────────────▲────────────────┘
                                       │
                                       │ server-only call
                                       │
┌──────────────────────────────────────┴───────────────────────┐
│ src/core/khalil/coach/runtime/                               │
│  - buildPrompt(snapshot)  ← pure TS, deterministic shape     │
│  - validateProposal(raw)  ← Zod ProposalSchema               │
└──────────────────────────────────────────────────────────────┘
                                       │
                                       │
┌──────────────────────────────────────▼───────────────────────┐
│ src/core/khalil/coach/gateway/                               │
│  - khalil.coach.propose.read  ← issues proposal              │
│  - khalil.coach.accept        ← executes via capability      │
│  - khalil.coach.dismiss       ← records dismissal            │
└──────────────────────────────────────────────────────────────┘
```

## Hard rules

1. The coach NEVER calls Supabase write functions directly. It returns a
   `suggested_action: CapabilityIntent` that the **accept** gateway then
   executes via the same capability check any manual action would face.
2. The coach NEVER reads from another domain's tables.
3. The coach NEVER hears the user's raw chat input in MVP. There is no
   chat interface. Only proposals + accept/dismiss.
4. The coach response is schema-validated; unknown fields are stripped;
   schema violations are dropped silently and a fallback `quiet-day` proposal
   is returned.
5. Provider identity (which model, which gateway) is NEVER leaked to UI
   error messages.
6. Coach prompts and copy strings live in i18n catalogs + a server-side
   prompt registry — never inlined in TSX.

## Forbidden

- ❌ Auto-applying any proposal (Art. XI).
- ❌ Persisting raw model output as truth without `validateProposal`.
- ❌ Cross-day memory in MVP (deferred to ADR-K-Coach-Memory).
- ❌ Surfacing the coach in any non-Khalil domain.
- ❌ Using Khalil coach prompts as marketing copy.
