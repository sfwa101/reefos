# Runtime: Observability

## Three pillars

| Pillar | Mechanism |
|---|---|
| Tracing | `trace_id` propagated end-to-end via `sovereignTracing`. |
| Logging | Structured `{ level, msg, trace_id, workspace_id, actor, domain, ... }`. |
| Audit | `audit_events`, `admin_override_logs` — append-only, RLS-locked. |

## Required instrumentation

- Gateway entry/exit
- Server fn entry/exit
- AI gateway invocation
- Event emission and subscription
- Capability denials
- Schema validation failures
- Realtime subscription lifecycle

## Forbidden

- Bare `console.log` outside `import.meta.env.DEV`.
- Logging request bodies, JWTs, capability tokens.
- Trace data containing PII.
- Audit writes from the client.
