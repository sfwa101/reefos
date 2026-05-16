# Runtime: Capabilities

## Lifecycle of a new capability

1. Declare key + descriptor in `src/core/capabilities/CapabilityRegistry.ts`.
2. Add to role bundle migration.
3. Apply on server (middleware) and client (guard) in the same patch.
4. If sensitivity ≥ `financial`: add audit emission.
5. Document usage in the owning domain memory.

## Sensitivity ladder

`public → member → operator → financial → sovereign`

## Invariants

- Unknown capability key fails closed.
- Capability resolution is server-side; client receives the resolved set.
- Sovereign overrides flow through the resolver and emit `sovereign.override.used`.
