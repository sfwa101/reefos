# Khalil — Domain Scaffold

This directory will host the Khalil sovereign domain. **Empty by design** in
phase P0. Code lands only after the governance layer in
`.salsabil/domains/khalil/` is ratified and an ADR opens phase P1.

## Layout (target)

```text
src/core/khalil/
  index.ts              ← public re-exports (kept minimal)
  schemas.ts            ← shared zod schemas
  events.ts             ← khalil.* event names + payload schemas
  gateway/              ← createServerFn entrypoints (one file per area)
  runtime/              ← pure TS domain logic (no React, no supabase)
  identity/             ← sub-domain: level + archetype
  prayer/               ← sub-domain
  habit/                ← sub-domain
  workout/              ← sub-domain
  weight/               ← sub-domain
  mood/                 ← sub-domain
  recovery/             ← sub-domain (first-class state machine)
  coach/                ← AI proposals (server-only)
  analytics/            ← private rollups
  orchestrator/         ← daily plan composition
```

## Hard rules (mirrored from `.salsabil/domains/khalil/architecture-map.md`)

1. UI under `src/apps/khalil/` imports **only** from `@/core/khalil/*`
   (hooks/server fns) and shared kernel utilities — never `supabase` directly.
2. `src/core/khalil/runtime/` is pure TypeScript — no React, no supabase.
3. No cross-domain imports (`@/core/reef-*`, `@/core/commerce`, …). Cross-
   domain talk happens via events + capabilities only.
4. Server fns read `process.env` **inside** `.handler()` only.
5. Every new capability key is registered in `CapabilityRegistry` in the
   same patch that uses it.

## Status

| Item | Status |
|---|---|
| Governance memory layer | ✅ P0 complete |
| Domain scaffold (this folder) | ⏳ awaiting P1 ADR |
| Sub-domain runtimes | ⏳ P1+ |
| AI coach | ⏳ P2 |

See `.salsabil/domains/khalil/DOMAIN_MEMORY.md` for the canonical spec.
