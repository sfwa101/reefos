# REEFOS — AI Governance

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Defines the sovereign rules for invoking, sandboxing, validating, and auditing AI inside REEFOS.

---

## 1. Doctrine

> **AI advises. The kernel decides. Policy gates. Audit remembers.**

No model output mutates state, renders UI, or reaches a user without passing the AI Governance Pipeline.

---

## 2. AI Layers

| Layer | Responsibility |
|---|---|
| **Advisors** (`hakim-*`) | Domain-specific assistants (pulse, advisor, architect, chat). |
| **Generators** | Image, text, embedding, descriptor generation. |
| **Gateway** (`ai_gateway`) | Single ingress for every model call — enforces governance. |
| **Sanitizer** (`sanitizeAiBlocks`) | Allow-lists block kinds and props. |
| **Policy Engine** | Capability + sensitivity + tenant policy check. |
| **Audit** | Immutable log of prompt hash, model, latency, decision. |

## 3. Invocation Pipeline

```text
caller ──▶ ai_gateway
            │ 1. resolve capability (caller MUST hold ai.<scope>.invoke)
            │ 2. resolve tenant + workspace policy
            │ 3. attach trace id
            ▼
         model provider
            │ 4. response schema validation (Zod)
            │ 5. sanitizeAiBlocks (allow-list)
            │ 6. policy gate (sensitivity, PII, cost ceiling)
            │ 7. audit emit (always)
            ▼
         caller receives candidate(s) — never commands
```

Steps 1–7 are non-skippable. Bypassing the gateway is a constitutional violation.

## 4. Hard Rules

- ❌ Direct calls to model providers from UI, hooks, or domain code.
- ❌ Persisting or rendering AI output without validation + sanitization.
- ❌ Granting AI write capability to any storage outside its scoped sandbox table.
- ❌ Letting AI determine its own capability set or escalate.
- ❌ Sending unredacted PII (national_id, payment instruments, addresses) to providers.
- ❌ Allowing AI to mutate pricing, capabilities, roles, tenancy, or events.
- ✅ AI MAY propose drafts (descriptors, copy, recommendations) for human/operator approval.
- ✅ AI MAY read projections it has capability for.
- ✅ AI candidates MUST be marked `provenance: "ai"` in any persisted form.

## 5. Sovereignty over Mutations

State changes triggered by AI proposals follow a **two-step ritual**:

1. **Propose** — AI emits a candidate; gateway validates; candidate stored as `ai_candidates` with status `pending`.
2. **Dispose** — A human operator (or a capability-bearing automation) issues an explicit command that references the candidate id; the kernel applies the change and emits an event with `cause: { kind: "ai_candidate", id }`.

No silent auto-apply, even for "trivial" changes.

## 6. Cost & Quota

- Every invocation reports `{ tokens_in, tokens_out, latency_ms, cost_estimate }` to observability.
- Per-workspace and per-capability budgets enforced at the gateway.
- Exhausted budgets fail closed; UI shows a graceful, non-leaky message.

## 7. Prompt Discipline

- Prompts are constructed from **typed templates**, not free-form string concatenation of user input.
- User-provided text is delimited and labeled (`<user_input>…</user_input>`) to reduce injection risk.
- System prompts MUST forbid the model from claiming authority, executing commands, or revealing other tenants' data.

## 8. Provider Abstraction

The platform routes through internal gateways (Lovable AI Gateway by default). Provider names are an internal concern; UI never references them.

## 9. Failure Modes

| Failure | Behavior |
|---|---|
| Schema invalid | drop candidate, audit `ai.candidate.rejected.schema` |
| Sanitizer rejected | drop candidate, audit `ai.candidate.rejected.sanitizer` |
| Policy denied | drop candidate, audit `ai.candidate.rejected.policy` |
| Provider error | retry per policy, then user-safe fallback message |
| Budget exhausted | fail closed, audit, surface graceful UX |

## 10. Forbidden Capabilities for AI

These capability keys MUST NEVER be granted to any AI principal:

- `*.role.*`, `*.capability.*`
- `finance.*.write` (payouts, refunds, ledger)
- `identity.*.write`
- `tenancy.*.write`
- `events.*.delete`

---

*An AI that can change the world without policy review is not an assistant — it is a hazard.*
