# Article X — Governance-First Engineering

## Order of operations

1. Governance document (constitution / architecture / domain memory / ADR).
2. Contract definition.
3. Schema + migration.
4. Runtime implementation.
5. UI.
6. Observability + audit.
7. Tests.

## Rules

- No code without a governance source.
- No governance without a sponsor and an ADR.
- No ADR without rationale, alternatives considered, and blast radius.

## Anti-pattern

> "I'll write the doc after the code works." — forbidden. The doc *is* the spec.
