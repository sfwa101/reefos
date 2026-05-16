# Article IX — Kernel Minimalism

> The kernel is mechanism. Policy lives outside.

## Kernel scope

- `src/core/runtime-ui/*`, `src/core/capabilities/*`, `src/core/events/*`,
  `src/core/sections/*`, `src/core/feeds/*`, `src/core/search/*`,
  `src/core/media/*`, `src/integrations/*`.

## Constraints

- ✅ Registries, resolvers, renderers, contracts.
- ❌ Tenant/role/section/locale branches.
- ❌ Imports from `src/apps/**`, `src/routes/**`, `src/pages/**`.
- ❌ Module-scope I/O or per-request singletons.

## Heuristic

> Remove every app and domain. The kernel must still build, test, and run with synthetic descriptors.
