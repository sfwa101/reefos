# REEFOS — Observability & Tracing

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Defines the discipline that makes REEFOS **inspectable, debuggable, and accountable** at any scale.

---

## 1. Doctrine

> **An action that cannot be traced did not happen — and must not be allowed.**

Observability is not a Phase 2 concern. It is a Phase 0 concern.

---

## 2. Three Pillars

| Pillar | Purpose | Primary tool |
|---|---|---|
| **Tracing** | Causal graph of a request across boundaries | `trace_id` + spans (`src/lib/sovereignTracing.ts`) |
| **Logging** | Structured records of notable moments | gateway/server function logs |
| **Audit** | Immutable, compliance-grade record of sensitive actions | `audit_events`, `admin_override_logs` |

Behavior analytics (`event-bus/useTrackBehavior`) is a **fourth, soft pillar** — useful for product, not a substitute for the three.

---

## 3. Trace Discipline

- Every server function entry creates or continues a `trace_id`.
- Every gateway call propagates `trace_id` to downstream calls (Supabase RPC, edge functions, AI gateway).
- Every emitted event carries `trace_id`.
- Every audit row carries `trace_id`.
- Every log line for a given request shares the same `trace_id`.

Result: a single id reconstructs the entire causal chain across UI intent → server fn → gateway → DB → event → projection → AI candidate.

## 4. Log Discipline

- Logs are **structured** (`{ level, msg, trace_id, workspace_id, actor, domain, ... }`), never bare strings.
- No PII, no secrets, no full payloads. Hash or redact.
- Log levels:
  - `debug` — dev only
  - `info` — notable lifecycle events
  - `warn` — degraded but recoverable
  - `error` — failed operation requiring attention
  - `fatal` — integrity at risk; page on-call
- Silent catches are forbidden. A `try/catch` MUST log or rethrow.

## 5. Audit Discipline

Audit applies to:

- All capability uses with sensitivity ≥ `financial` or `sovereign`.
- All AI candidate decisions (accepted/rejected, by whom).
- All sovereign overrides (with justification text).
- All cross-tenant access by sovereign roles.
- All schema migrations (operator id + ADR ref).

Audit rows are append-only, RLS-locked to insert by writer role and read by `audit.read` capability holders.

## 6. Metrics & SLOs

Each domain owns SLOs (e.g. catalog read p95 latency, checkout success rate). Metrics:

- counters (events emitted, errors raised),
- histograms (latency, payload size),
- gauges (queue depth, cache hit rate).

Where infrastructure lacks a metrics backend, gateways MUST still emit structured `metric` log lines so that adopting one later is mechanical.

## 7. Required Instrumentation Points

- Gateway entry/exit
- Server function entry/exit
- AI gateway invocation
- Event emission and subscription
- Capability check denials
- Schema validation failures
- Realtime subscription lifecycle

## 8. Forbidden Patterns

- ❌ Bare `console.log` in production code paths (allowed only behind `import.meta.env.DEV`).
- ❌ Catching errors and returning success.
- ❌ Logging full request bodies, JWTs, or capability tokens.
- ❌ Tracing data containing PII.
- ❌ Audit writes from the client.

## 9. Developer Hygiene

- Every PR that adds a gateway method adds tracing.
- Every PR that adds an event adds an audit consideration.
- Every PR that adds an AI invocation adds the governance audit row.

## 10. User-Facing Surface

Errors shown to users are **graceful and provider-agnostic**. They never reveal stack traces, table names, provider names, or trace ids (a trace id may be shown only as an opaque support code).

---

*If you cannot prove what happened, you cannot fix it, defend it, or improve it. Observe everything that matters.*
