# Layering & Boundaries

## Import direction matrix

| From \ To       | Apps | Gateway | Domain | Kernel | Integrations |
|-----------------|:----:|:-------:|:------:|:------:|:------------:|
| Apps            |  ✅  |   ✅    |   ❌   |  ✅*   |     ❌       |
| Gateway         |  ❌  |   ✅    |   ✅   |  ✅    |     ✅       |
| Domain Runtime  |  ❌  |   ❌    |   ✅   |  ✅    |     ✅       |
| Kernel          |  ❌  |   ❌    |   ❌   |  ✅    |     ❌       |
| Integrations    |  ❌  |   ❌    |   ❌   |  ❌    |     ✅       |

*Apps may import kernel **contracts** (renderer, registries) — not internals.

## Module shape

Every domain module exposes:

```text
src/core/<domain>/
  index.ts              # public contract
  gateway/*.ts          # capability-checked entry points (server fns)
  runtime/*.ts          # invariants, projections, pure logic
  schemas.ts            # zod schemas, types
  events.ts             # event catalog for this domain
  README.md             # → mirrors .salsabil/domains/<domain>.md
```

## Enforcement

Boundary violations are caught by ESLint (eventually), code review, and AI governance scans.
