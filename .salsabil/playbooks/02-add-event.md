# Playbook 02 — Add an Event

## Steps

1. Choose a past-tense name: `<domain>.<aggregate>.<verb_past>`.
2. Register in `src/core/events/catalog.ts` with version `1` and payload schema.
3. Emit only from a gateway or server fn — never UI, never AI directly.
4. Add subscribers in their own files; each idempotent on `event.id`.
5. If sensitivity ≥ `financial`: also write to `audit_events`.
6. Update the owning domain memory: events emitted/consumed tables.

## Verification

- Schema validation rejects malformed payloads.
- Duplicate delivery does not double-effect.
- Trace id propagates to subscribers.

## Rollback

Stop emitting; leave the event in the catalog (deprecated tag). Never delete past rows.
