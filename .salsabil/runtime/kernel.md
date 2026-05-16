# Runtime: Kernel

The kernel provides **mechanism**. It contains no business rules.

## Modules

- `runtime-ui/` — descriptor renderer, block registry, SDUI engine.
- `capabilities/` — capability registry + resolver.
- `events/` — event catalog + bus primitives.
- `sections/` — section identity registry.
- `feeds/` — kind-based feed runtime.
- `search/` — search registry + provider abstraction.
- `media/` — media resolver + lazy image primitives.

## Test

> Strip all `apps/`, `routes/`, `domains/`. The kernel still builds and runs with synthetic descriptors. If not, policy has leaked into mechanism.
