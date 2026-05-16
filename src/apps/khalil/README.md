# Khalil (خليل) — Sovereign Transformation OS

**Sovereign owner of:** AI-guided human transformation — identity evolution,
discipline, spirituality, physical/mental health, mood, recovery, adaptive
daily orchestration.

**Not Maeen.** Khalil is NOT the super-app launcher. The launcher concern
is owned by the Maeen domain (`src/apps/maeen/`, route `/_app/maeen`).
See ADR-0002 and ADR-0003.

## Phase

Currently in **P0.1 — boundary correction**. The runtime under
`src/core/khalil/` is intentionally empty until ADR-K-P1 ratifies the
first slice. The route `/khalil` renders a governance landing only.

## Boundaries

- `src/apps/khalil/` (this dir) holds presentation code only. It MUST
  consume Khalil capabilities through `@/core/khalil/*` (the domain
  gateway), never reach into other domains directly.
- MUST NOT import from `src/apps/maeen/**`.
- MAY consume the kernel: `@/core/runtime-ui/*`, `@/core/capabilities/*`,
  `@/core/events/*`, `@/core/theme/*`, `@/components/ui/*`.

## Governance documents

`.salsabil/domains/khalil/DOMAIN_MEMORY.md` and siblings — read those
before proposing any code under this directory.
