# Article II — Evolutionary Sovereign Architecture

## Principle

The architecture is composed of **sovereign layers**, each independently replaceable behind a stable contract.

## Layers (outer depends on inner, never the inverse)

```text
UI / Apps           ──▶  consumes contracts
Gateways            ──▶  enforces policy, emits events
Domain Runtimes     ──▶  owns business invariants
Kernel              ──▶  mechanism only (registries, renderers, bus)
Integrations        ──▶  typed adapters to external systems
```

## Sovereignty rules

- A layer MUST NOT import from a higher layer.
- A layer MUST expose a typed contract (`index.ts`) — consumers import only the contract.
- A layer MAY be rewritten internally without notifying consumers as long as the contract holds.
- A layer MUST publish a deprecation ADR before breaking its contract.

## Replaceability test

> Could this layer be reimplemented in a different language/runtime without changing any consumer? If no, the contract is leaking.
