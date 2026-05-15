# ADR 001 — Legacy Catalog Deprecation (PURGE 07)

- **Status:** Accepted
- **Date:** 2026-05-15
- **Wave:** PURGE 07 (The Great Cleanse — Operation Zero)
- **Supersedes:** Implicit reliance on `categories`, `product_units`, `product_variants_v2`

---

## Context

The sovereign catalog has migrated to the `salsabil_*` family
(`salsabil_assets`, `salsabil_skus`, `salsabil_financial_contracts`,
`salsabil_packaging_tiers`). The legacy tables (`categories`,
`product_units`, `product_variants_v2`) remain in the database for
historical reasons but are **no longer the source of truth** for any
runtime read or write path.

Continued ad-hoc reads/writes against these tables would:

1. Bypass the `SovereignCatalogGateway`, breaking BFF contracts.
2. Dilute the upcoming Multi-Tenant cutover.
3. Reintroduce shape-drift between RawAsset rows and `Product` VMs.

## Decision

The following tables are **Deprecated** as of PURGE 07 and will be
**dropped** at the Multi-Tenant cutover:

- `public.categories`
- `public.product_units`
- `public.product_variants_v2`

### Prohibitions (Zero Tolerance)

- ❌ No `SELECT`, `INSERT`, `UPDATE`, or `DELETE` against the deprecated
  tables from any new application code, server function, or hook.
- ❌ No new foreign keys referencing these tables.
- ❌ No new TypeScript types, hooks, DTOs, or React Query keys derived
  from their schema.
- ❌ No new Supabase RPCs that read or mutate them.

### Mandates

- ✅ All catalog reads MUST flow through `SovereignCatalogGateway`.
- ✅ All catalog mutations MUST go through the corresponding
  `createServerFn` server functions.
- ✅ Any data still required from a legacy table MUST be migrated to its
  `salsabil_*` equivalent before the Multi-Tenant cutover.

### Enforcement

- **Wave P-10:** ESLint custom rule blocking string literals matching the
  deprecated table names in non-migration source files.
- **Sovereign Tracing:** Alarm on
  `pg_stat_user_tables.seq_scan` deltas for the deprecated tables; any
  non-zero increase after PURGE 07 fires `Tracer.warn("catalog",
  "deprecated_table_access", …)`.
- **Migrations:** A future migration will `DROP` these tables once the
  Multi-Tenant rewrite ships.

## Consequences

- New contributors have a single, explicit document to reference.
- The `salsabil_*` schema becomes the unambiguous source of truth.
- Legacy data must be archived or migrated before the drop migration.

## References

- `src/core/catalog/gateway/SovereignCatalogGateway.ts`
- `src/core/catalog/legacyProduct.types.ts`
- Wave P-9 — Catalog × Packaging Integration
