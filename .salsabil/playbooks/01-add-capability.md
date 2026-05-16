# Playbook 01 — Add a Capability

## Preconditions

- ADR drafted if sensitivity ≥ `financial`.
- Owning domain identified.

## Steps

1. Declare key + descriptor in `src/core/capabilities/CapabilityRegistry.ts`.
2. Add to the appropriate role bundle migration.
3. Apply on server: `requireCapability("<key>")` middleware in every relevant server fn.
4. Apply on client: `<CapabilityGuard cap="<key>">` and/or `useCapability("<key>")`.
5. If sensitivity ≥ `financial`: emit audit row on use.
6. Update the owning domain memory: capabilities list.
7. Add tests: denied path + granted path.

## Verification

- Unknown key fails closed.
- Capability appears in resolved set for granted role.
- Audit row written on use (if applicable).

## Rollback

Remove from registry → revert role bundle migration → remove guards.
