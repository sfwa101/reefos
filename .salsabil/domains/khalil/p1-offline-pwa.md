# Khalil — P1 Offline / PWA Readiness Report

## MVP posture

> **Read-first offline, write-queue offline.** Full offline-first is a P3 goal.

## What works offline in MVP

| Capability | Offline read | Offline write |
|---|---|---|
| Home composition | last successful render cached | n/a |
| Prayer today | yes (last fetch) | **queued** |
| Habit today | yes (last fetch) | **queued** |
| Workout session | yes (open session cached) | **queued** sets |
| Weight log | last 30d cached | **queued** |
| Recovery toggle | last state cached | **queued** |
| Identity chip | last state cached | n/a |
| Analytics | last projection cached, stale-tagged | n/a |
| Coach | last proposal cached, no new fetch | accept/dismiss queued |

## Write-queue contract (ADR-K006 must finalize)

```text
1. UI invokes gateway hook.
2. If offline: serialize { capability_key, args, client_event_id, ts } into
   an IndexedDB-backed queue.
3. Show optimistic state with a "pending sync" indicator.
4. On reconnect: replay queue FIFO; each entry hits its real gateway.
5. Server treats `client_event_id` as the idempotency key. Duplicate
   replays are no-ops.
6. Conflicts (e.g. recovery toggle ordering): server timestamp wins,
   client is notified, UI reconciles.
```

Forbidden in MVP queue: workout session_started without session_closed
within 24h (auto-closed server-side on replay).

## Service worker scope

- Precache: shell, fonts, critical CSS, ar catalog.
- Runtime cache: gateway responses with `stale-while-revalidate` for reads,
  network-first for writes.
- Background sync triggers queue drain.

## PWA manifest

- Standalone display mode.
- Maskable icon variants.
- Theme color matches active Khalil theme token.
- Start URL `/khalil/`.

## Forbidden

- ❌ Treating IndexedDB as the source of truth. It is a queue + cache only.
- ❌ Allowing offline edits to past events (only append + queue replay).
- ❌ Caching coach prompts across days while offline (proposals are time-bound).
- ❌ Caching another domain's responses inside Khalil's service worker.
