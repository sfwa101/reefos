# Article III — Capability-First Architecture

All authorization is **capability-based**. Roles are bundles, never checks.

## Rules

- Capabilities are declared in a central registry; unknown keys fail closed.
- UI guards are UX only; server middleware re-checks.
- RLS + capability check are both required — neither replaces the other.
- Capabilities with sensitivity ≥ `financial` emit audit events on every use.

## Forbidden

- `if (user.role === "admin")` anywhere.
- Dynamic capability strings built from user input.
- Granting capabilities from the client.
- Substituting capability checks for RLS.

See `runtime/capabilities.md` for the lifecycle of a new capability.
