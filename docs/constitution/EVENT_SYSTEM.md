# REEFOS — Event System

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Establishes events as the **immutable spine** of REEFOS state.

---

## 1. Doctrine

> **State is a projection. Events are the truth.**

If a state change cannot be reconstructed from events, it did not legitimately happen.

---

## 2. Event Anatomy

```ts
interface DomainEvent<TName extends string, TPayload> {
  id: string;            // ULID
  name: TName;           // dot-namespaced, e.g. "order.placed"
  version: number;       // schema version, monotonic
  occurred_at: string;   // ISO 8601 UTC
  actor: { kind: "user" | "system" | "ai"; id: string };
  workspace_id: string;
  trace_id: string;      // joins to observability span
  cause?: { kind: string; id: string };  // optional causal pointer
  payload: TPayload;     // schema-validated
}
```

## 3. Catalog & Naming

- All event names MUST be registered in `src/core/events/catalog.ts`.
- Naming: `<domain>.<aggregate>.<verb_past_tense>` — `cart.item.added`, `order.placed`, `wallet.credit.granted`.
- Past tense only. Events describe what **happened**, never what should happen.

## 4. Immutability

- Events are **append-only**. No update, no delete, no in-place rewrite.
- Corrections happen via **compensating events** (`order.refunded`, `wallet.credit.reversed`).
- Storage tables enforce this with RLS: INSERT-only for the writer role; UPDATE/DELETE denied for everyone except sovereign migrations.

## 5. Producers

- Only **gateways** and **server functions** produce events.
- Components, hooks, and AI candidates MUST NOT emit events directly. They issue **intents** that flow to a gateway, which decides and emits.

## 6. Consumers

- Subscribers register through the typed event bus (`event-bus`) with a schema constraint.
- Subscribers are **idempotent** — duplicate delivery MUST NOT duplicate effects (use `event.id` as dedupe key).
- A subscriber that throws does not poison other subscribers; failures are traced and retried per policy.

## 7. Projections

- Read models (denormalized tables, caches, search indexes) are **rebuilt** from the event log.
- Any projection that drifts from the log is wrong by definition. Reset it.

## 8. Forbidden Patterns

- ❌ Mutating state without an event.
- ❌ Editing past events to "fix" data.
- ❌ Constructing event names dynamically from user input.
- ❌ Emitting events from the browser without server validation.
- ❌ Cross-domain consumers reading another domain's internal projection — subscribe to the event instead.

## 9. Versioning

- Additive payload changes: new optional fields → bump minor in code, no version bump required if all consumers tolerate.
- Breaking changes: introduce `<name>` v(N+1); keep both during a deprecation window; never silently change semantics.

## 10. Audit & Compliance

- All events with `sensitivity ≥ financial` MUST also write a row to `audit_events` for compliance retention.
- All sovereign-override flows MUST emit `sovereign.override.used` with full justification metadata.

## 11. Example

```ts
// gateway emits, never the component
await commerceGateway.placeOrder(input);
// internally:
emit({
  name: "order.placed",
  version: 3,
  payload: { order_id, total, currency, lines },
  actor, workspace_id, trace_id,
});
```

---

*A system that forgets cannot be trusted. Remember everything important — exactly once, forever.*
