/**
 * Sovereign Workspace Identity — Wave P-7 Batch A.
 *
 * Pure in-memory client-side cache for the server-attested workspace
 * identity. NO React Context. NO hostname sniffing. NO env reads.
 *
 * The value is hydrated exactly once at app boot by a `whoAmI` server
 * function (Wave P-7 Batch B) which reads `workspace_id` from the
 * authenticated JWT claim. Until hydration completes, all readers see
 * `null` and MUST treat that as "not yet authenticated" — never as a
 * default tenant.
 */

let _workspaceId: string | null = null;

/**
 * Persist the server-resolved workspace id into the in-memory store.
 * Called exactly once by the root hydration effect after `whoAmI`
 * returns. Repeated calls with the same id are no-ops; calls with a
 * different id are accepted (workspace switch) and reset the cache
 * prefix for downstream query keys.
 */
export function hydrateWorkspaceId(id: string): void {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("hydrateWorkspaceId: id must be a non-empty string");
  }
  _workspaceId = id;
}

/**
 * Synchronous, non-React reader. Returns `null` when the workspace
 * identity has not yet been hydrated from the server. Callers in
 * critical paths must guard for `null` and defer their work.
 */
export function getWorkspaceIdSync(): string | null {
  return _workspaceId;
}

/**
 * TanStack Query key prefixer — partitions the persisted IndexedDB
 * cache by workspace so cross-workspace contamination is impossible
 * by construction. Returns a `["workspace", "<unhydrated>", ...]`
 * placeholder when called before hydration; consumers should gate
 * their queries on `enabled: getWorkspaceIdSync() !== null`.
 */
export function workspaceQueryKey(
  ...segments: ReadonlyArray<unknown>
): ReadonlyArray<unknown> {
  return ["workspace", _workspaceId ?? "<unhydrated>", ...segments];
}

/**
 * Test/SSR-only reset. Not exported through the package barrel. Used
 * by unit tests that need a clean slate between cases.
 */
export function __resetWorkspaceIdForTests(): void {
  _workspaceId = null;
}
