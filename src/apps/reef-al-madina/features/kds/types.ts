/**
 * Phase 55 — Kitchen Display System (KDS) types.
 *
 * Per Constitution Law 2 (no DDL when JSONB suffices), prep state is carried
 * inside `salsabil_fulfillment_nodes.delivery_snapshot.prep_meta`. This avoids
 * touching a hot OLTP table for an evolving operator-side concern.
 */

export type PrepStatus = "pending" | "preparing" | "ready";

export interface PrepMeta {
  status: PrepStatus;
  started_at: string | null;
  completed_at: string | null;
  station?: string | null;
  expected_minutes?: number | null;
}

export const DEFAULT_PREP_META: PrepMeta = {
  status: "pending",
  started_at: null,
  completed_at: null,
  station: null,
  expected_minutes: null,
};

export const readPrepMeta = (snapshot: unknown): PrepMeta => {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  const pm = (s.prep_meta ?? {}) as Partial<PrepMeta>;
  const status: PrepStatus =
    pm.status === "preparing" || pm.status === "ready" ? pm.status : "pending";
  return {
    status,
    started_at: pm.started_at ?? null,
    completed_at: pm.completed_at ?? null,
    station: pm.station ?? null,
    expected_minutes: pm.expected_minutes ?? null,
  };
};
