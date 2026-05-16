# Playbook 04 — Schema Migration

## Rules

- One migration = one logical change.
- Always reversible (down migration documented, even if not executed).
- Never `ALTER DATABASE postgres`.
- Never touch reserved schemas (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
- Validation via triggers, not `CHECK` with non-immutable expressions.

## Steps

1. ADR if breaking or cross-domain.
2. Author migration via the migration tool.
3. Update domain memory tables list.
4. Update consumer code in same PR.
5. Verify with `cloud_status` → `ACTIVE_HEALTHY` before heavy writes.

## Rollback

Have a compensating migration ready before applying the forward one.
