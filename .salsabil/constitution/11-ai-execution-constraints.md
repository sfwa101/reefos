# Article XI — AI Execution Constraints

> AI advises. The kernel decides. Policy gates. Audit remembers.

## Rules

- AI output reaches state only through the **propose → dispose** ritual.
- Every AI invocation passes through the AI Gateway: capability → policy → schema → sanitize → audit.
- AI MUST NOT hold capabilities in: roles, capabilities, finance writes, identity writes, tenancy writes, event deletes.
- AI-authored candidates carry `provenance: "ai"` in any persisted form.
- Prompts use typed templates; user input is delimited and labeled.

## Forbidden

- Direct provider calls from UI or domain code.
- Auto-applying AI suggestions without a disposing actor.
- Sending unredacted PII to providers.

See `prompts/00-ai-execution-protocol.md` for the operational protocol.
