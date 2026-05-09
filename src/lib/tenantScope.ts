/**
 * tenantScope — Phase 41 Tenant Isolation helpers.
 *
 * Two responsibilities:
 *
 *   1. `tenantQueryKey(...)` — prefixes every TanStack Query key with the
 *      active tenant so the persisted IndexedDB cache is partitioned by
 *      tenant and cross-contamination is impossible by construction.
 *
 *   2. `tenantStoragePath(...)` — namespaces every Supabase Storage path
 *      under `tenants/<tenant>/...` so a stray upload can never land in
 *      another tenant's namespace.
 *
 * Both helpers fall back to the synchronously-resolved tenant id from
 * `getActiveTenantId()` so they are safe to call from non-React code.
 */
import { getActiveTenantId } from "@/context/TenantContext";

/** Prefix any query key array with `["tenant", tenantId, ...rest]`. */
export function tenantQueryKey(
  ...segments: ReadonlyArray<unknown>
): ReadonlyArray<unknown> {
  return ["tenant", getActiveTenantId(), ...segments];
}

/**
 * Build a tenant-scoped storage object path. Strips any leading slash to
 * keep paths normalised, then prepends `tenants/<tenant>/`.
 *
 * Example:
 *   tenantStoragePath("uploads/products/abc.jpg")
 *     → "tenants/reef-al-madina/uploads/products/abc.jpg"
 */
export function tenantStoragePath(path: string): string {
  const normalised = path.replace(/^\/+/, "");
  return `tenants/${getActiveTenantId()}/${normalised}`;
}
