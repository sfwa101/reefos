# Article V — Domain Sovereignty

Each domain owns its **data, contracts, invariants, and lifecycle**.

## Rules

- A domain publishes a single contract module (`<domain>/index.ts`).
- Cross-domain reads go through published contracts or subscribed events.
- A domain MUST NOT reach into another domain's tables, hooks, or internal projections.
- A domain MUST maintain its memory file at `.salsabil/domains/<domain>.md`.

## Domain memory template

See `domains/_template.md`.

## Forbidden

- Shared "utils" that hide cross-domain coupling.
- UI components that import from two domains' internals.
- Database joins across domain boundaries without an explicit cross-domain contract.
