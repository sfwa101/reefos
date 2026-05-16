# Anti-Pattern 06 — Cross-Domain Table Read

## Symptom

Domain A's gateway selects directly from domain B's tables.

## Why forbidden

- Violates Article V (Domain Sovereignty).
- Couples internal projection of B to A; B cannot refactor freely.

## Correct pattern

- Call B's public contract, OR
- Subscribe to B's events and maintain A's own projection.
