# Runtime: Events

## Event shape

```ts
interface DomainEvent<TName extends string, TPayload> {
  id: string;             // ULID
  name: TName;            // <domain>.<aggregate>.<verb_past>
  version: number;
  occurred_at: string;    // ISO 8601 UTC
  actor: { kind: "user" | "system" | "ai"; id: string };
  workspace_id: string;
  trace_id: string;
  cause?: { kind: string; id: string };
  payload: TPayload;
}
```

## Rules

- Append-only. Corrections via compensating events.
- Subscribers idempotent on `event.id`.
- Names registered in `src/core/events/catalog.ts`.
- Past tense only.

## Catalog change protocol

Add → migrate consumers → bump version when breaking → never silently change semantics.
