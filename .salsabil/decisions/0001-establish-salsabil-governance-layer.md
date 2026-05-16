# ADR-0001: Establish `.salsabil/` Sovereign Governance Layer

- **Status:** accepted
- **Date:** 2026-05-16
- **Sponsor:** Sovereign Architect
- **Domain:** constitution

## Context

The project has grown into a multi-domain runtime (storefront, admin, POS, KDS, vendor, driver, AI). Architectural intent lives scattered across `docs/`, `TECH_PHILOSOPHY.md`, and tribal memory. AI agents and engineers have no single authoritative source to consult, leading to drift, hardcodes, and silent kernel pollution.

## Decision

Establish `.salsabil/` as the **single, authoritative, machine-readable governance memory** of the project. Structure: `constitution/`, `architecture/`, `runtime/`, `domains/`, `prompts/`, `decisions/`, `context/`, `playbooks/`, `anti-patterns/`.

Code defers to `.salsabil/`. AI agents MUST consult it. Conflicts resolve upward.

## Alternatives considered

- **Continue with `docs/`** — rejected: not enforced, not structured for AI consumption, mixes audits with policy.
- **External wiki** — rejected: drifts from code, not versioned with the repo.

## Consequences

- Positive: single source of truth; AI-governable; explicit precedence; ADR discipline.
- Negative: new discipline overhead; existing `docs/` content must be progressively migrated or referenced.
- Blast radius: governance only; no code changed in this ADR.

## Migration plan

1. Create `.salsabil/` skeleton with foundational documents (this ADR).
2. Backfill domain memories on first material change per domain.
3. Migrate or reference relevant `docs/constitution/*` content over subsequent ADRs.
4. Add CI check (future ADR) to verify ADR references on architectural changes.

## Observability impact

None in this ADR. Future ADRs will introduce a `governance.consulted` trace tag for AI invocations.

## References

- `docs/constitution/*` — predecessor documents, to be reconciled.
- `TECH_PHILOSOPHY.md`
