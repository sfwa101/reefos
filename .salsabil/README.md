# .salsabil/ — Sovereign Governance Memory

This directory is the **machine-readable governance and architecture memory** of the project.
It is authoritative. Code defers to it. AI agents MUST consult it before acting.

## Layout

| Path | Purpose |
|---|---|
| `constitution/` | Inviolable laws. Cannot be broken by features, refactors, or AI. |
| `architecture/` | Macro structure: layers, boundaries, ownership maps. |
| `runtime/` | Runtime model: events, gateways, capabilities, kernel. |
| `domains/` | Per-domain sovereign memory (catalog, cashier, finance, …). |
| `prompts/` | AI execution protocols, role contracts, system prompts. |
| `decisions/` | ADR log — every architectural decision, dated and immutable. |
| `context/` | Project context: glossary, actors, environments, invariants. |
| `playbooks/` | Operational procedures: migrations, incidents, rollouts. |
| `anti-patterns/` | Catalog of forbidden patterns with rationale. |

## Reading order for a new agent

1. `constitution/00-charter.md`
2. `context/00-glossary.md`
3. `architecture/00-overview.md`
4. `runtime/00-model.md`
5. `prompts/00-ai-execution-protocol.md`
6. Domain memory for the area being touched.
7. Relevant ADRs in `decisions/`.

## Mutation rules

- `constitution/` — amend only via ADR with explicit "amends-constitution" tag.
- `decisions/` — append-only; never edit a past ADR, supersede it.
- All other folders — evolve freely under PR review, but never silently.
