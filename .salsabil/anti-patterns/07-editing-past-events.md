# Anti-Pattern 07 — Editing Past Events

## Symptom

`UPDATE events SET payload = ... WHERE id = ...` to "fix" history.

## Why forbidden

- Events are the system's truth (Article IV). Editing them breaks every projection and every audit.

## Correct pattern

Emit a compensating event: `*.reversed`, `*.corrected`, `*.refunded`. The log grows; truth is preserved.
