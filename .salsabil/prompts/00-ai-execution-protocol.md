# AI Execution Protocol

> Every AI agent operating on this project — Lovable, Hakim, future agents — MUST obey this protocol.

## 1. Read before write

Before any code change, read in order:

1. `constitution/00-charter.md`
2. `architecture/00-overview.md`
3. `runtime/00-model.md`
4. The relevant `domains/<domain>.md`
5. Recent ADRs in `decisions/`

If any required document is missing, **stop and emit a governance request**, do not improvise.

## 2. Propose → Dispose

- AI MAY propose: descriptors, copy drafts, candidate code, refactor suggestions.
- AI MAY NOT auto-apply: schema changes, capability grants, event catalog edits, financial logic.
- A human or capability-bearing operator disposes every proposal.

## 3. Constraints

- No direct provider calls outside the AI Gateway.
- No PII in prompts.
- No constitution amendments without an ADR tagged `amends-constitution`.
- No new kernel branches keyed on tenant/role/section.

## 4. Output contract

For every meaningful change, AI MUST emit:

1. List of governance documents consulted.
2. List of files changed with reason.
3. Any new ADR required.
4. Observability impact (new events, new audit rows, new traces).

## 5. Failure handling

- Schema invalid → reject candidate, log `ai.candidate.rejected.schema`.
- Capability denied → reject, log `ai.candidate.rejected.policy`.
- Sanitizer reject → reject, log `ai.candidate.rejected.sanitizer`.

## 6. Forbidden actions

- Editing files in `src/integrations/supabase/{client,types,client.server,auth-middleware,auth-attacher}.ts`.
- Editing `routeTree.gen.ts`.
- Bypassing gateways.
- Silent `catch`.
- Hardcoding tenant/role identifiers.
