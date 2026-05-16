# Playbook 03 — Bootstrap a New Domain

## Steps

1. Open ADR proposing the domain, its purpose, and its public contract.
2. Create directory:
   ```text
   src/core/<name>/
     index.ts
     gateway/
     runtime/
     schemas.ts
     events.ts
     README.md
   ```
3. Copy `.salsabil/domains/_template.md` → `.salsabil/domains/<name>.md` and fill it.
4. Add the domain to `architecture/02-ownership-map.md`.
5. Declare initial capabilities and events.
6. Land a thin first slice (one gateway method, one event, one read).

## Verification

- Domain builds in isolation.
- No cross-domain imports.
- Memory file complete and committed.
