# Playbook 06 — Deprecate a Contract

## Steps

1. ADR tagged `breaks-contract` with consumer audit.
2. **Announce** — mark deprecated in source + domain memory; add console warn in dev.
3. **Dual-run** — ship new contract alongside old; migrate consumers one by one.
4. **Remove** — only after zero consumers remain, recorded in a follow-up ADR.

## Required artifacts

- Deprecation date.
- Removal date.
- Consumer migration checklist.
- Rollback plan during dual-run window.
