# Article XII — Runtime Memory Persistence

Every notable runtime decision MUST be **observable, traceable, and reconstructable**.

## Three pillars

| Pillar | Purpose |
|---|---|
| Tracing | Causal graph across boundaries via `trace_id`. |
| Logging | Structured records, no PII, no secrets. |
| Audit | Immutable, compliance-grade record of sensitive actions. |

## Rules

- Every server-fn entry creates/continues a `trace_id`.
- Every event, audit row, and log line carries `trace_id`.
- Capability uses with sensitivity ≥ `financial` emit audit rows.
- Silent `catch` is forbidden — log or rethrow.
- Errors shown to users never leak stack traces, table names, or provider identities.
