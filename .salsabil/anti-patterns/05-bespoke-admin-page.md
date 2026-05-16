# Anti-Pattern 05 — Bespoke Admin Page

## Symptom

A hand-built admin route with its own table, filters, and Supabase calls, parallel to the SDUI admin renderer.

## Why forbidden

- Admin UI is composed from descriptors (Article VIII).
- Bespoke pages fragment governance and bypass entity definitions.

## Correct pattern

Register an entity definition; render via `AdminTableEngine` / `AdminFormEngine`.
